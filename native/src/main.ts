import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  shell,
  Tray,
} from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log";
import { ChildProcess, spawn } from "child_process";
import crypto from "crypto";
import fs from "fs";
import http from "http";
import path from "path";

interface ServerConfiguration {
  dataDirectory: string;
  frontendPort: number;
  autoStart: boolean;
  openBrowserOnLaunch: boolean;
  secrets: {
    jwtSecret: string;
    refreshSecret: string;
    mediaSecret: string;
    boardPassword: string;
  };
}

type ServerStatus = "not-configured" | "stopped" | "starting" | "running" | "error";

const API_PORT = 4010;
const DATA_DIRECTORIES = ["uploads", "blobs", "previews", "thumbnails", "temp", "tmp", "logs", "database", "backups"];
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let backendProcess: ChildProcess | null = null;
let frontendProcess: ChildProcess | null = null;
let status: ServerStatus = "stopped";
let statusMessage = "";
let openingBrowser = false;
let quitting = false;

log.initialize();
log.transports.file.level = "info";
autoUpdater.logger = log;

function configPath(): string {
  return path.join(app.getPath("userData"), "server-config.json");
}

function loadConfiguration(): ServerConfiguration | null {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf8")) as ServerConfiguration;
  } catch {
    return null;
  }
}

function saveConfiguration(configuration: ServerConfiguration): void {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(configuration, null, 2), { mode: 0o600 });
}

function generateSecret(): string {
  return crypto.randomBytes(48).toString("base64url");
}

function createConfiguration(input: Partial<ServerConfiguration>): ServerConfiguration {
  const existing = loadConfiguration();
  return {
    dataDirectory: String(input.dataDirectory || existing?.dataDirectory || path.join(app.getPath("documents"), "NexxCloudData")),
    frontendPort: Number(input.frontendPort || existing?.frontendPort || 3000),
    autoStart: input.autoStart ?? existing?.autoStart ?? true,
    openBrowserOnLaunch: input.openBrowserOnLaunch ?? existing?.openBrowserOnLaunch ?? true,
    secrets: existing?.secrets || {
      jwtSecret: generateSecret(),
      refreshSecret: generateSecret(),
      mediaSecret: generateSecret(),
      boardPassword: generateSecret(),
    },
  };
}

function ensureDataDirectory(configuration: ServerConfiguration): void {
  fs.mkdirSync(configuration.dataDirectory, { recursive: true });
  DATA_DIRECTORIES.forEach((directory) => {
    fs.mkdirSync(path.join(configuration.dataDirectory, directory), { recursive: true });
  });

  const testPath = path.join(configuration.dataDirectory, ".nexxcloud-write-test");
  fs.writeFileSync(testPath, "ok");
  fs.unlinkSync(testPath);
}

function resourcePath(...segments: string[]): string {
  const root = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, "..");
  return path.join(root, ...segments);
}

function runtimeNodeArguments(entry: string): { executable: string; args: string[]; env: NodeJS.ProcessEnv } {
  return {
    executable: process.execPath,
    args: [entry],
    env: app.isPackaged ? { ELECTRON_RUN_AS_NODE: "1" } : {},
  };
}

function dashboardUrl(configuration: ServerConfiguration): string {
  return `http://localhost:${configuration.frontendPort}`;
}

function databaseUrl(configuration: ServerConfiguration): string {
  const databasePath = path.join(configuration.dataDirectory, "database", "nexxcloud.db").replace(/\\/g, "/");
  return `file:${databasePath}`;
}

function publicState() {
  const configuration = loadConfiguration();
  return {
    configured: !!configuration,
    configuration: configuration
      ? {
          dataDirectory: configuration.dataDirectory,
          frontendPort: configuration.frontendPort,
          autoStart: configuration.autoStart,
          openBrowserOnLaunch: configuration.openBrowserOnLaunch,
          dashboardUrl: dashboardUrl(configuration),
          apiPort: API_PORT,
        }
      : null,
    status: configuration ? status : "not-configured",
    statusMessage,
  };
}

function broadcastState(): void {
  mainWindow?.webContents.send("native:state", publicState());
  rebuildTrayMenu();
}

function appendServiceLog(service: string, chunk: Buffer | string, configuration: ServerConfiguration): void {
  const message = chunk.toString();
  fs.appendFileSync(path.join(configuration.dataDirectory, "logs", `${service}.log`), message);
  log.info(`[${service}] ${message.trim()}`);
}

async function waitForHealthy(url: string, timeoutMs = 45000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const healthy = await new Promise<boolean>((resolve) => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve((response.statusCode || 500) < 400);
      });
      request.on("error", () => resolve(false));
      request.setTimeout(1000, () => {
        request.destroy();
        resolve(false);
      });
    });
    if (healthy) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function runNativeMigrations(configuration: ServerConfiguration): Promise<void> {
  const prismaCli = resourcePath("runtime", "backend", "node_modules", "prisma", "build", "index.js");
  const schema = resourcePath("runtime", "backend", "prisma", "native", "schema.prisma");
  const packagedMigrationsDirectory = resourcePath("runtime", "backend", "prisma", "native", "migrations");
  const migrationLedgerDirectory = path.join(configuration.dataDirectory, "database", ".migrations");
  const node = runtimeNodeArguments(prismaCli);
  fs.mkdirSync(migrationLedgerDirectory, { recursive: true });

  const migrations = fs.readdirSync(packagedMigrationsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const migration of migrations) {
    const marker = path.join(migrationLedgerDirectory, `${migration}.applied`);
    if (fs.existsSync(marker)) continue;

    const script = path.join(packagedMigrationsDirectory, migration, "migration.sql");
    if (!fs.existsSync(script)) {
      throw new Error(`Native database migration ${migration} is missing its SQL script`);
    }

    await new Promise<void>((resolve, reject) => {
      const processHandle = spawn(node.executable, [...node.args, "db", "execute", "--file", script, "--schema", schema], {
        cwd: resourcePath("runtime", "backend"),
        env: {
          ...process.env,
          ...node.env,
          DATABASE_URL: databaseUrl(configuration),
        },
        windowsHide: true,
      });
      processHandle.stdout?.on("data", (chunk) => appendServiceLog("migration", chunk, configuration));
      processHandle.stderr?.on("data", (chunk) => appendServiceLog("migration", chunk, configuration));
      processHandle.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Database migration ${migration} failed (${code})`)));
      processHandle.on("error", reject);
    });

    fs.writeFileSync(marker, `${new Date().toISOString()}\n`, { flag: "wx" });
  }
}

async function startServer(): Promise<void> {
  const configuration = loadConfiguration();
  if (!configuration || status === "starting" || status === "running") return;

  status = "starting";
  statusMessage = "Preparing local database and services";
  broadcastState();

  try {
    ensureDataDirectory(configuration);
    await runNativeMigrations(configuration);

    const backendEntry = resourcePath("runtime", "backend", "dist", "server.js");
    const backendNode = runtimeNodeArguments(backendEntry);
    backendProcess = spawn(backendNode.executable, backendNode.args, {
      cwd: resourcePath("runtime", "backend"),
      env: {
        ...process.env,
        ...backendNode.env,
        NODE_ENV: "production",
        NEXXCLOUD_NATIVE_RUNTIME: "true",
        PORT: String(API_PORT),
        DATABASE_URL: databaseUrl(configuration),
        STORAGE_ROOT: configuration.dataDirectory,
        FRONTEND_URL: dashboardUrl(configuration),
        JWT_SECRET: configuration.secrets.jwtSecret,
        JWT_REFRESH_SECRET: configuration.secrets.refreshSecret,
        MEDIA_TOKEN_SECRET: configuration.secrets.mediaSecret,
        BULL_BOARD_PASSWORD: configuration.secrets.boardPassword,
        UPLOAD_CHUNK_SIZE: "8388608",
        MAX_UPLOAD_CHUNK_SIZE: "268435456",
        MAX_FILE_SIZE: "1099511627776",
      },
      windowsHide: true,
    });
    backendProcess.stdout?.on("data", (chunk) => appendServiceLog("backend", chunk, configuration));
    backendProcess.stderr?.on("data", (chunk) => appendServiceLog("backend", chunk, configuration));
    backendProcess.once("exit", (code) => serviceExited("Backend", code));

    await waitForHealthy(`http://127.0.0.1:${API_PORT}/health/ready`);

    const frontendEntry = resourcePath("runtime", "frontend", "server.js");
    const frontendNode = runtimeNodeArguments(frontendEntry);
    frontendProcess = spawn(frontendNode.executable, frontendNode.args, {
      cwd: resourcePath("runtime", "frontend"),
      env: {
        ...process.env,
        ...frontendNode.env,
        NODE_ENV: "production",
        HOSTNAME: "0.0.0.0",
        PORT: String(configuration.frontendPort),
        INTERNAL_API_URL: `http://127.0.0.1:${API_PORT}`,
      },
      windowsHide: true,
    });
    frontendProcess.stdout?.on("data", (chunk) => appendServiceLog("frontend", chunk, configuration));
    frontendProcess.stderr?.on("data", (chunk) => appendServiceLog("frontend", chunk, configuration));
    frontendProcess.once("exit", (code) => serviceExited("Frontend", code));

    await waitForHealthy(`${dashboardUrl(configuration)}/health`);
    status = "running";
    statusMessage = "Server is healthy and available on your network";
    broadcastState();

    if (configuration.openBrowserOnLaunch && !openingBrowser && !process.argv.includes("--background")) {
      openingBrowser = true;
      await shell.openExternal(dashboardUrl(configuration));
    }
  } catch (error) {
    status = "error";
    statusMessage = error instanceof Error ? error.message : "Unable to start native server";
    log.error(statusMessage);
    await stopServer(false);
    broadcastState();
  }
}

function serviceExited(name: string, code: number | null): void {
  if (status === "stopped") return;
  status = "error";
  statusMessage = `${name} stopped unexpectedly (${code ?? "unknown"}). Use Restart Server to recover.`;
  broadcastState();
}

async function stopServer(updateState = true): Promise<void> {
  const children = [frontendProcess, backendProcess].filter(Boolean) as ChildProcess[];
  if (updateState) {
    status = "stopped";
    statusMessage = "Stopping server";
    broadcastState();
  }
  await Promise.all(children.map((child) => new Promise<void>((resolve) => {
    if (child.exitCode !== null) {
      resolve();
      return;
    }
    const forceTimer = setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
    }, 5000);
    child.once("exit", () => {
      clearTimeout(forceTimer);
      resolve();
    });
    child.kill();
  })));
  frontendProcess = null;
  backendProcess = null;
  if (updateState) {
    statusMessage = "Server stopped";
    broadcastState();
  }
}

async function restartServer(): Promise<void> {
  await stopServer();
  await startServer();
}

async function createBackup(): Promise<string> {
  const configuration = loadConfiguration();
  if (!configuration) throw new Error("Configure NexxCloud before creating a backup");
  if (status === "starting") throw new Error("Wait for startup to finish before creating a backup");

  const servicesActive = !!backendProcess || !!frontendProcess;
  if (servicesActive) await stopServer();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDirectory = path.join(configuration.dataDirectory, "backups", timestamp);
  fs.mkdirSync(backupDirectory, { recursive: true });

  const database = path.join(configuration.dataDirectory, "database", "nexxcloud.db");
  if (fs.existsSync(database)) {
    fs.copyFileSync(database, path.join(backupDirectory, "nexxcloud.db"));
  }
  fs.copyFileSync(configPath(), path.join(backupDirectory, "server-config.json"));
  fs.writeFileSync(
    path.join(backupDirectory, "README.txt"),
    "NexxCloud native backup. Stop the server before restoring nexxcloud.db and server-config.json.\n"
  );

  if (servicesActive) await startServer();
  return backupDirectory;
}

function setAutoStart(enabled: boolean): void {
  const configuration = loadConfiguration();
  if (!configuration) return;
  configuration.autoStart = enabled;
  saveConfiguration(configuration);
  app.setLoginItemSettings({
    openAtLogin: enabled,
    args: ["--background"],
  });
  broadcastState();
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 560,
    height: 720,
    minWidth: 480,
    minHeight: 620,
    show: !process.argv.includes("--background"),
    backgroundColor: "#070912",
    title: "NexxCloud Server",
    icon: resourcePath("nexxcloud-icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  void mainWindow.loadFile(resourcePath("ui", "index.html"));
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file:")) event.preventDefault();
  });
  mainWindow.on("close", (event) => {
    if (!quitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function rebuildTrayMenu(): void {
  if (!tray) return;
  const configuration = loadConfiguration();
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: status === "running" ? "NexxCloud Server: Online" : `NexxCloud Server: ${status}`, enabled: false },
    { type: "separator" },
    { label: "Open Dashboard", enabled: status === "running", click: () => configuration && void shell.openExternal(dashboardUrl(configuration)) },
    { label: "Server Settings", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: "Open Data Directory", enabled: !!configuration, click: () => configuration && void shell.openPath(configuration.dataDirectory) },
    { label: "Open Logs", enabled: !!configuration, click: () => configuration && void shell.openPath(path.join(configuration.dataDirectory, "logs")) },
    { label: "Create Backup", enabled: !!configuration && status !== "starting", click: () => void createBackup().then((folder) => shell.openPath(folder)).catch((error) => log.error("Backup failed", error)) },
    { type: "separator" },
    { label: "Start Server", enabled: status !== "running" && !!configuration, click: () => void startServer() },
    { label: "Restart Server", enabled: status === "running", click: () => void restartServer() },
    { label: "Stop Server", enabled: status === "running", click: () => void stopServer() },
    { type: "separator" },
    { label: "Start on Login", type: "checkbox", checked: configuration?.autoStart ?? false, enabled: !!configuration, click: (item) => setAutoStart(item.checked) },
    { label: "Quit NexxCloud", click: () => { quitting = true; void stopServer().finally(() => app.quit()); } },
  ]));
}

function createTray(): void {
  tray = new Tray(nativeImage.createFromPath(resourcePath("nexxcloud-icon.png")).resize({ width: 18, height: 18 }));
  tray.setToolTip("NexxCloud Server");
  tray.on("double-click", () => {
    const configuration = loadConfiguration();
    if (status === "running" && configuration) void shell.openExternal(dashboardUrl(configuration));
    else mainWindow?.show();
  });
  rebuildTrayMenu();
}

function registerIpc(): void {
  ipcMain.handle("native:get-state", () => publicState());
  ipcMain.handle("native:choose-data-directory", async () => {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"], title: "Where should NexxCloud store your data?" });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle("native:save-configuration", async (_event, input: Partial<ServerConfiguration>) => {
    if (status === "starting") throw new Error("Wait for startup to finish before changing server configuration");
    const configuration = createConfiguration(input);
    if (!Number.isInteger(configuration.frontendPort) || configuration.frontendPort < 1024 || configuration.frontendPort > 65534 || configuration.frontendPort === API_PORT) {
      throw new Error("Choose a port between 1024 and 65534 other than 4010");
    }
    ensureDataDirectory(configuration);
    const servicesActive = !!backendProcess || !!frontendProcess;
    if (servicesActive) await stopServer();
    saveConfiguration(configuration);
    setAutoStart(configuration.autoStart);
    status = "stopped";
    statusMessage = "Configuration saved";
    broadcastState();
    return publicState();
  });
  ipcMain.handle("native:start-server", () => startServer().then(publicState));
  ipcMain.handle("native:stop-server", () => stopServer().then(publicState));
  ipcMain.handle("native:restart-server", () => restartServer().then(publicState));
  ipcMain.handle("native:open-dashboard", () => {
    const configuration = loadConfiguration();
    if (configuration) return shell.openExternal(dashboardUrl(configuration));
  });
  ipcMain.handle("native:open-data-directory", () => {
    const configuration = loadConfiguration();
    if (configuration) return shell.openPath(configuration.dataDirectory);
  });
  ipcMain.handle("native:open-logs", () => {
    const configuration = loadConfiguration();
    if (configuration) return shell.openPath(path.join(configuration.dataDirectory, "logs"));
  });
  ipcMain.handle("native:create-backup", async () => {
    const folder = await createBackup();
    await shell.openPath(folder);
    return publicState();
  });
  ipcMain.handle("native:set-autostart", (_event, enabled: boolean) => {
    setAutoStart(enabled);
    return publicState();
  });
}

app.whenReady().then(async () => {
  registerIpc();
  createMainWindow();
  createTray();
  const configuration = loadConfiguration();
  if (configuration) {
    app.setLoginItemSettings({ openAtLogin: configuration.autoStart, args: ["--background"] });
    await startServer();
  }
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch((error) => log.warn("Update check failed", error));
  }
});

app.on("window-all-closed", () => {
  // The tray application intentionally continues running.
});

app.on("before-quit", () => {
  quitting = true;
  void stopServer(false);
});
