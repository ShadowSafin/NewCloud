import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("nexxcloud", {
  getState: () => ipcRenderer.invoke("native:get-state"),
  chooseDataDirectory: () => ipcRenderer.invoke("native:choose-data-directory"),
  saveConfiguration: (configuration: unknown) => ipcRenderer.invoke("native:save-configuration", configuration),
  startServer: () => ipcRenderer.invoke("native:start-server"),
  stopServer: () => ipcRenderer.invoke("native:stop-server"),
  restartServer: () => ipcRenderer.invoke("native:restart-server"),
  openDashboard: () => ipcRenderer.invoke("native:open-dashboard"),
  openDataDirectory: () => ipcRenderer.invoke("native:open-data-directory"),
  openLogs: () => ipcRenderer.invoke("native:open-logs"),
  createBackup: () => ipcRenderer.invoke("native:create-backup"),
  setAutoStart: (enabled: boolean) => ipcRenderer.invoke("native:set-autostart", enabled),
  onState: (listener: (state: unknown) => void) => {
    ipcRenderer.on("native:state", (_event, state) => listener(state));
  },
});
