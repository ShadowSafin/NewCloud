import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("nexxcloudDesktop", {
  getState: () => ipcRenderer.invoke("desktop:get-state"),
  connect: (serverUrl: string) => ipcRenderer.invoke("desktop:connect", serverUrl),
  retry: () => ipcRenderer.invoke("desktop:retry"),
  saveSettings: (settings: unknown) => ipcRenderer.invoke("desktop:save-settings", settings),
  openSettings: () => ipcRenderer.invoke("desktop:open-settings"),
  returnToApp: () => ipcRenderer.invoke("desktop:return-to-app"),
  clearCache: () => ipcRenderer.invoke("desktop:clear-cache"),
  openLogs: () => ipcRenderer.invoke("desktop:open-logs"),
  resetApp: () => ipcRenderer.invoke("desktop:reset-app"),
  onState: (listener: (state: unknown) => void) => {
    ipcRenderer.on("desktop:state", (_event, state) => listener(state));
  },
});
