const { ipcMain } = require("electron/main");

function registerIpc({ controller }) {
  ipcMain.handle("bootstrap:get", () => controller.getBootstrap());
  ipcMain.handle("settings:update", (_event, partialConfig) =>
    controller.handleSettingsUpdate(partialConfig)
  );
  ipcMain.handle("reminder:act", (_event, payload) => controller.handleReminderAction(payload));
  ipcMain.handle("app:quit", () => controller.requestQuit());
  ipcMain.handle("app:open-data-dir", () => controller.openDataDir());
}

module.exports = {
  registerIpc
};
