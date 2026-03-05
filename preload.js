const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld("visionApi", {
  actOnReminder(payload) {
    return ipcRenderer.invoke("reminder:act", payload);
  },
  getBootstrap() {
    return ipcRenderer.invoke("bootstrap:get");
  },
  onStateChanged(listener) {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on("state:changed", wrapped);
    return () => ipcRenderer.removeListener("state:changed", wrapped);
  },
  openDataDir() {
    return ipcRenderer.invoke("app:open-data-dir");
  },
  quitApp() {
    return ipcRenderer.invoke("app:quit");
  },
  updateSettings(partialConfig) {
    return ipcRenderer.invoke("settings:update", partialConfig);
  }
});
