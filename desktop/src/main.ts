import {
  app,
  BrowserWindow,
  ipcMain,
  IpcMainInvokeEvent,
  Menu,
  nativeImage,
  Rectangle,
  session,
  shell,
  Tray,
} from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log";
import fs from "fs";
import http from "http";
import https from "https";
import path from "path";

type ConnectionStatus = "searching" | "connecting" | "connected" | "offline" | "settings";

interface DesktopConfiguration {
  serverUrl: string;
  recentServers: string[];
  autoStart: boolean;
  autoReconnect: boolean;
  minimizeToTray: boolean;
  lastLocation?: string;
  bounds?: Rectangle;
  maximized?: boolean;
}

interface DesktopState {
  status: ConnectionStatus;
  message: string;
  configuration: DesktopConfiguration;
  connectedUrl: string | null;
  showingWebApp: boolean;
}

interface SavedWindowBounds {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

const SESSION_PARTITION = "persist:nexxcloud-desktop";
const DEFAULT_SERVER = "http://localhost:3000";
const LOCAL_CANDIDATES = [DEFAULT_SERVER, "http://127.0.0.1:3000"];
const CONNECTION_POLL_MS = 5000;
const FAILED_POLLS_BEFORE_OFFLINE = 2;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let stateStatus: ConnectionStatus = "searching";
let stateMessage = "Looking for a local NexxCloud server";
let connectedUrl: string | null = null;
let remoteLocation: string | null = null;
let showingWebApp = false;
let showingSettings = false;
let loadingShellInternally = false;
let failedPolls = 0;
let quitting = false;

log.initialize();
log.transports.file.level = "info";
autoUpdater.logger = log;

function resourcePath(...segments: string[]): string {
  const base = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, "..");
  return path.join(base, ...segments);
}

function configurationPath(): string {
  return path.join(app.getPath("userData"), "desktop-config.json");
}

function normalizeServerUrl(input: string): string {
  const candidate = input.trim().includes("://") ? input.trim() : `http://${input.trim()}`;
  const url = new URL(candidate);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Use an http:// or https:// NexxCloud address");
  }
  if (url.username || url.password) {
    throw new Error("Server URLs cannot contain credentials");
  }
  url.hash = "";
  url.search = "";
  const pathname = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${pathname === "/" ? "" : pathname}`;
}

function defaultConfiguration(): DesktopConfiguration {
  return {
    serverUrl: DEFAULT_SERVER,
    recentServers: [],
    autoStart: app.getLoginItemSettings().openAtLogin,
    autoReconnect: true,
    minimizeToTray: true,
  };
}

function loadConfiguration(): DesktopConfiguration {
  try {
    const stored = JSON.parse(fs.readFileSync(configurationPath(), "utf8")) as Partial<DesktopConfiguration>;
    const fallback = defaultConfiguration();
    return {
      ...fallback,
      ...stored,
      serverUrl: normalizeServerUrl(stored.serverUrl || fallback.serverUrl),
      recentServers: Array.isArray(stored.recentServers)
        ? stored.recentServers.map(normalizeServerUrl).slice(0, 6)
        : [],
    };
  } catch {
    return defaultConfiguration();
  }
}

function saveConfiguration(configuration: DesktopConfiguration): void {
  fs.mkdirSync(path.dirname(configurationPath()), { recursive: true });
  fs.writeFileSync(configurationPath(), JSON.stringify(configuration, null, 2), { mode: 0o600 });
}

function updateConfiguration(update: Partial<DesktopConfiguration>): DesktopConfiguration {
  const current = loadConfiguration();
  const next = { ...current, ...update };
  saveConfiguration(next);
  return next;
}

function setAutoStart(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    args: ["--background"],
  });
}

function applyInstallerStartupArgument(): boolean {
  const setupArgument = process.argv.find((argument) => argument.startsWith("--set-autostart="));
  if (!setupArgument) return false;
  const enabled = setupArgument.endsWith("enabled");
  updateConfiguration({ autoStart: enabled });
  setAutoStart(enabled);
  return true;
}

function shellFileUrl(): string {
  return `file://${resourcePath("ui", "index.html").replace(/\\/g, "/")}`;
}

function isLocalShellUrl(url: string): boolean {
  return url.startsWith("file:") && url.toLowerCase().includes("/ui/index.html");
}

function allowedWebOrigin(): string | null {
  try {
    return new URL(loadConfiguration().serverUrl).origin;
  } catch {
    return null;
  }
}

function isAllowedWebUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.origin === allowedWebOrigin();
  } catch {
    return false;
  }
}

function safeRemoteLocation(url: string): string | null {
  if (!isAllowedWebUrl(url)) return null;
  const parsed = new URL(url);
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function state(): DesktopState {
  return {
    status: stateStatus,
    message: stateMessage,
    configuration: loadConfiguration(),
    connectedUrl,
    showingWebApp,
  };
}

function broadcastState(): DesktopState {
  const nextState = state();
  if (mainWindow && !mainWindow.isDestroyed() && !showingWebApp) {
    mainWindow.webContents.send("desktop:state", nextState);
  }
  rebuildTrayMenu();
  return nextState;
}

function requestJson(url: string, redirects = 0): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    const transport = url.startsWith("https:") ? https : http;
    const request = transport.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location && redirects < 2) {
        response.resume();
        requestJson(new URL(response.headers.location, url).toString(), redirects + 1).then(resolve);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        resolve(null);
        return;
      }
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk: string) => {
        body += chunk;
        if (body.length > 32_768) request.destroy();
      });
      response.on("end", () => {
        try {
          resolve(JSON.parse(body) as Record<string, unknown>);
        } catch {
          resolve(null);
        }
      });
    });
    request.setTimeout(2500, () => {
      request.destroy();
      resolve(null);
    });
    request.on("error", () => resolve(null));
  });
}

async function serverIsAvailable(serverUrl: string): Promise<boolean> {
  const frontendHealth = await requestJson(`${serverUrl}/health`);
  if (!frontendHealth || frontendHealth.status !== "ok" || frontendHealth.name !== "NexxCloud Frontend") {
    return false;
  }
  const backendHealth = await requestJson(`${serverUrl}/api/health`);
  return backendHealth?.status === "ok" && backendHealth.name === "NexxCloud";
}

async function showShell(status: ConnectionStatus, message: string, settings = false): Promise<void> {
  stateStatus = status;
  stateMessage = message;
  showingWebApp = false;
  showingSettings = settings;
  if (!mainWindow) return;
  if (!isLocalShellUrl(mainWindow.webContents.getURL())) {
    loadingShellInternally = true;
    try {
      await mainWindow.loadFile(resourcePath("ui", "index.html"));
    } finally {
      loadingShellInternally = false;
    }
  }
  broadcastState();
  if (!process.argv.includes("--background") || settings || status === "offline") {
    mainWindow.show();
  }
}

function rememberServer(serverUrl: string): DesktopConfiguration {
  const configuration = loadConfiguration();
  return updateConfiguration({
    serverUrl,
    recentServers: [serverUrl, ...configuration.recentServers.filter((entry) => entry !== serverUrl)].slice(0, 6),
  });
}

async function loadWebApplication(serverUrl: string): Promise<void> {
  if (!mainWindow) return;
  const previous = remoteLocation || loadConfiguration().lastLocation || null;
  const target = previous && isAllowedWebUrl(previous) ? previous : serverUrl;
  showingSettings = false;
  connectedUrl = serverUrl;
  showingWebApp = true;
  stateStatus = "connected";
  stateMessage = `Connected to ${serverUrl}`;
  failedPolls = 0;
  await mainWindow.loadURL(target);
  mainWindow.show();
  broadcastState();
}

async function connectToServer(input: string, remember = true): Promise<DesktopState> {
  let serverUrl: string;
  try {
    serverUrl = normalizeServerUrl(input);
  } catch (error) {
    await showShell("offline", error instanceof Error ? error.message : "Invalid server URL", true);
    return state();
  }
  stateStatus = "connecting";
  stateMessage = `Connecting to ${serverUrl}`;
  broadcastState();
  if (!(await serverIsAvailable(serverUrl))) {
    connectedUrl = null;
    await showShell("offline", `Cannot reach NexxCloud at ${serverUrl}`, showingSettings);
    return state();
  }
  if (remember) rememberServer(serverUrl);
  await loadWebApplication(serverUrl);
  return state();
}

async function findServerOnStartup(): Promise<void> {
  const configuration = loadConfiguration();
  const candidates = Array.from(new Set([configuration.serverUrl, ...configuration.recentServers, ...LOCAL_CANDIDATES]));
  await showShell("searching", "Looking for a NexxCloud server");
  for (const candidate of candidates) {
    if (await serverIsAvailable(candidate)) {
      rememberServer(candidate);
      await loadWebApplication(candidate);
      return;
    }
  }
  await showShell("offline", "Server unavailable. Enter a local or LAN address to connect.");
}

async function checkConnectedServer(): Promise<void> {
  const configuration = loadConfiguration();
  if (!configuration.autoReconnect || showingSettings) return;
  if (showingWebApp && connectedUrl) {
    if (await serverIsAvailable(connectedUrl)) {
      failedPolls = 0;
      return;
    }
    failedPolls += 1;
    if (failedPolls >= FAILED_POLLS_BEFORE_OFFLINE) {
      remoteLocation = safeRemoteLocation(mainWindow?.webContents.getURL() || "") || remoteLocation;
      connectedUrl = null;
      await showShell("offline", "Connection lost. Reconnecting automatically.");
    }
    return;
  }
  if (stateStatus === "offline") {
    await connectToServer(configuration.serverUrl, false);
  }
}

function startReconnectMonitor(): void {
  if (reconnectTimer) clearInterval(reconnectTimer);
  reconnectTimer = setInterval(() => {
    void checkConnectedServer().catch((error) => log.warn("Reconnect check failed", error));
  }, CONNECTION_POLL_MS);
  reconnectTimer.unref();
}

function iconPath(): string {
  return resourcePath("nexxcloud-icon.png");
}

function restoreWindowBounds(configuration: DesktopConfiguration): SavedWindowBounds {
  if (configuration.bounds && configuration.bounds.width >= 720 && configuration.bounds.height >= 520) {
    return configuration.bounds;
  }
  return { width: 1280, height: 820 };
}

function createMainWindow(): void {
  const configuration = loadConfiguration();
  const bounds = restoreWindowBounds(configuration);
  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: Number.isFinite(bounds.x) ? bounds.x : undefined,
    y: Number.isFinite(bounds.y) ? bounds.y : undefined,
    minWidth: 720,
    minHeight: 520,
    show: false,
    backgroundColor: "#050710",
    title: "NexxCloud",
    icon: iconPath(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      partition: SESSION_PARTITION,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: false,
      allowRunningInsecureContent: false,
    },
  });
  if (configuration.maximized) mainWindow.maximize();

  mainWindow.on("close", (event) => {
    if (!quitting && loadConfiguration().minimizeToTray) {
      event.preventDefault();
      mainWindow?.hide();
      return;
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      updateConfiguration({ bounds: mainWindow.getBounds(), maximized: mainWindow.isMaximized() });
    }
  });
  // Electron emits this event at runtime, but its current BrowserWindow typing omits the overload.
  (mainWindow as unknown as { on(event: "minimize", listener: () => void): void }).on("minimize", () => {
    if (loadConfiguration().minimizeToTray) mainWindow?.hide();
  });
  mainWindow.on("resize", () => {
    if (mainWindow && !mainWindow.isMaximized()) updateConfiguration({ bounds: mainWindow.getBounds() });
  });
  mainWindow.on("move", () => {
    if (mainWindow && !mainWindow.isMaximized()) updateConfiguration({ bounds: mainWindow.getBounds() });
  });
  mainWindow.on("maximize", () => updateConfiguration({ maximized: true }));
  mainWindow.on("unmaximize", () => updateConfiguration({ maximized: false }));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedWebUrl(url)) {
      void mainWindow?.loadURL(url);
    } else if (url.startsWith("https:") || url.startsWith("http:")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if ((loadingShellInternally && isLocalShellUrl(url)) || isAllowedWebUrl(url)) return;
    event.preventDefault();
    if (url.startsWith("http:") || url.startsWith("https:")) void shell.openExternal(url);
  });
  mainWindow.webContents.on("did-navigate", (_event, url) => {
    const safeLocation = safeRemoteLocation(url);
    if (safeLocation) {
      remoteLocation = safeLocation;
      updateConfiguration({ lastLocation: safeLocation });
    }
  });
  mainWindow.webContents.on("did-navigate-in-page", (_event, url) => {
    const safeLocation = safeRemoteLocation(url);
    if (safeLocation) {
      remoteLocation = safeLocation;
      updateConfiguration({ lastLocation: safeLocation });
    }
  });
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, _description, validatedURL, isMainFrame) => {
    if (isMainFrame && errorCode !== -3 && isAllowedWebUrl(validatedURL)) {
      connectedUrl = null;
      void showShell("offline", "Could not load this server. Retrying automatically.");
    }
  });
}

function createTray(): void {
  const trayImage = nativeImage.createFromPath(iconPath()).resize({ width: 18, height: 18 });
  tray = new Tray(trayImage);
  tray.setToolTip("NexxCloud Desktop");
  tray.on("double-click", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
  rebuildTrayMenu();
}

function rebuildTrayMenu(): void {
  if (!tray) return;
  const configuration = loadConfiguration();
  const label = stateStatus === "connected" ? "Connected" : stateStatus === "connecting" ? "Connecting" : "Offline";
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: `NexxCloud: ${label}`, enabled: false },
    { type: "separator" },
    { label: "Open NexxCloud", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: "Reconnect", click: () => void connectToServer(configuration.serverUrl) },
    { label: "Connection Settings", click: () => void showShell("settings", "Connection settings", true) },
    { label: "Restart Desktop App", click: () => { quitting = true; app.relaunch(); app.quit(); } },
    { type: "separator" },
    {
      label: "Launch at Startup",
      type: "checkbox",
      checked: configuration.autoStart,
      click: (item) => {
        setAutoStart(item.checked);
        updateConfiguration({ autoStart: item.checked });
        broadcastState();
      },
    },
    {
      label: "Minimize to Tray",
      type: "checkbox",
      checked: configuration.minimizeToTray,
      click: (item) => {
        updateConfiguration({ minimizeToTray: item.checked });
        broadcastState();
      },
    },
    { type: "separator" },
    { label: "Quit NexxCloud", click: () => { quitting = true; app.quit(); } },
  ]));
}

function requireShellSender(event: IpcMainInvokeEvent): void {
  if (!isLocalShellUrl(event.senderFrame?.url || "")) {
    throw new Error("Desktop settings are only available from the local control screen");
  }
}

function registerIpc(): void {
  ipcMain.handle("desktop:get-state", (event: IpcMainInvokeEvent) => {
    requireShellSender(event);
    return state();
  });
  ipcMain.handle("desktop:connect", (event: IpcMainInvokeEvent, serverUrl: string) => {
    requireShellSender(event);
    showingSettings = false;
    return connectToServer(serverUrl);
  });
  ipcMain.handle("desktop:retry", (event: IpcMainInvokeEvent) => {
    requireShellSender(event);
    showingSettings = false;
    return connectToServer(loadConfiguration().serverUrl, false);
  });
  ipcMain.handle("desktop:save-settings", (event: IpcMainInvokeEvent, value: Partial<DesktopConfiguration>) => {
    requireShellSender(event);
    const current = loadConfiguration();
    const serverUrl = normalizeServerUrl(String(value.serverUrl || current.serverUrl));
    const next = updateConfiguration({
      serverUrl,
      autoStart: Boolean(value.autoStart),
      autoReconnect: Boolean(value.autoReconnect),
      minimizeToTray: Boolean(value.minimizeToTray),
    });
    setAutoStart(next.autoStart);
    broadcastState();
    return state();
  });
  ipcMain.handle("desktop:open-settings", (event: IpcMainInvokeEvent) => {
    requireShellSender(event);
    return showShell("settings", "Connection settings", true).then(state);
  });
  ipcMain.handle("desktop:return-to-app", (event: IpcMainInvokeEvent) => {
    requireShellSender(event);
    showingSettings = false;
    return connectToServer(loadConfiguration().serverUrl, false);
  });
  ipcMain.handle("desktop:clear-cache", async (event: IpcMainInvokeEvent) => {
    requireShellSender(event);
    await session.fromPartition(SESSION_PARTITION).clearCache();
    stateMessage = "Cached resources cleared";
    return broadcastState();
  });
  ipcMain.handle("desktop:open-logs", (event: IpcMainInvokeEvent) => {
    requireShellSender(event);
    return shell.openPath(path.dirname(log.transports.file.getFile().path));
  });
  ipcMain.handle("desktop:reset-app", async (event: IpcMainInvokeEvent) => {
    requireShellSender(event);
    await session.fromPartition(SESSION_PARTITION).clearStorageData();
    setAutoStart(false);
    const reset = defaultConfiguration();
    saveConfiguration(reset);
    connectedUrl = null;
    remoteLocation = null;
    return showShell("offline", "Desktop state reset. Select a server to connect.", true).then(state);
  });
}

function configureSessionSecurity(): void {
  const webSession = session.fromPartition(SESSION_PARTITION);
  webSession.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    callback(permission === "notifications" && isAllowedWebUrl(details.requestingUrl));
  });
  webSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    return permission === "notifications" && isAllowedWebUrl(requestingOrigin);
  });
}

function registerProtocol(): void {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("nexxcloud", process.execPath, [path.resolve(process.argv[1])]);
  } else {
    app.setAsDefaultProtocolClient("nexxcloud");
  }
}

function deepLinkTarget(argumentsList: string[]): string | null {
  const deepLink = argumentsList.find((argument) => argument.startsWith("nexxcloud://"));
  if (!deepLink) return null;
  try {
    return new URL(deepLink).searchParams.get("url");
  } catch (error) {
    log.warn("Rejected malformed deep link", error);
    return null;
  }
}

const primaryInstance = app.requestSingleInstanceLock();
if (!primaryInstance) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    const target = deepLinkTarget(commandLine);
    if (target) void connectToServer(target);
    mainWindow?.show();
    mainWindow?.focus();
  });

  app.whenReady().then(async () => {
    if (applyInstallerStartupArgument()) {
      app.quit();
      return;
    }
    if (process.platform === "win32") app.setAppUserModelId("io.nexxcloud.desktop");
    registerProtocol();
    configureSessionSecurity();
    registerIpc();
    createMainWindow();
    createTray();
    startReconnectMonitor();
    if (app.isPackaged) {
      void autoUpdater.checkForUpdatesAndNotify().catch((error) => log.info("Update check unavailable", error.message));
    }
    const target = deepLinkTarget(process.argv);
    if (target) {
      await connectToServer(target);
    } else {
      await findServerOnStartup();
    }
  }).catch((error) => {
    log.error("Desktop startup failed", error);
    app.quit();
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && !loadConfiguration().minimizeToTray) app.quit();
});

app.on("activate", () => {
  mainWindow?.show();
});

app.on("before-quit", () => {
  quitting = true;
  if (reconnectTimer) clearInterval(reconnectTimer);
});
