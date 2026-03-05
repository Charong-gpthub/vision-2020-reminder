const path = require("node:path");
const { app, globalShortcut, powerMonitor, shell } = require("electron/main");

const { createScheduler } = require("./src/domain/scheduler");
const { createStatsProvider } = require("./src/domain/stats");
const { createAppController } = require("./src/main/app-controller");
const { registerIpc } = require("./src/main/ipc");
const { createWindowManager } = require("./src/main/window-manager");
const { createConfigStore } = require("./src/storage/config-store");
const { createLogStore } = require("./src/storage/log-store");

let tickTimer = null;

function resolveDataDir() {
  if (process.env.VISION2020_DATA_DIR) {
    return path.resolve(process.env.VISION2020_DATA_DIR);
  }

  if (app.isPackaged) {
    return path.join(path.dirname(process.execPath), "data");
  }

  return path.join(__dirname, "data");
}

function buildAutomationConfig() {
  if (process.env.VISION2020_AUTOMATION !== "1") {
    return { enabled: false };
  }

  return {
    enabled: true,
    action: process.env.VISION2020_AUTOMATION_ACTION || "DONE",
    delayMs: Number(process.env.VISION2020_AUTOMATION_DELAY_MS || 800)
  };
}

async function main() {
  const dataDir = resolveDataDir();
  const configStore = createConfigStore({
    rootDir: __dirname,
    dataDir
  });
  const logStore = createLogStore({ rootDir: dataDir });
  const statsProvider = createStatsProvider({ logStore });
  const windowManager = createWindowManager({
    assetRootDir: __dirname
  });
  const automation = buildAutomationConfig();

  const controller = createAppController({
    schedulerFactory: (config, launchAt) =>
      createScheduler({
        launchAt,
        intervalSec: config.intervalSec,
        snoozeDefaultSec: config.snoozeDefaultSec
      }),
    configStore,
    logStore,
    statsProvider,
    windowManager,
    shellAdapter: shell,
    appAdapter: {
      quit() {
        windowManager.prepareForQuit();
        app.quit();
      }
    },
    automation
  });

  windowManager.setCloseHandlers({
    onDashboardCloseRequest: () => controller.handleDashboardCloseRequest(),
    onReminderCloseRequest: () => controller.handleReminderWindowClosed()
  });

  controller.initialize();
  windowManager.ensureDashboardWindow(controller.getConfig());
  registerIpc({ controller });

  tickTimer = setInterval(() => {
    controller.handleTick(new Date());
  }, 1000);

  powerMonitor.on("resume", () => {
    controller.handleTick(new Date());
  });

  app.on("before-quit", () => {
    controller.prepareForQuit();
    windowManager.prepareForQuit();
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  });

  globalShortcut.register("CommandOrControl+Q", () => {
    controller.requestQuit();
  });
}

app.whenReady().then(main);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
