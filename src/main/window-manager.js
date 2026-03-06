const path = require("node:path");
const { BrowserWindow, screen } = require("electron/main");

const REMINDER_WINDOW_MARGIN = 24;
const REMINDER_WINDOW_MIN_WIDTH = 420;
const REMINDER_WINDOW_MIN_HEIGHT = 420;
const REMINDER_WINDOW_MAX_WIDTH = 560;
const REMINDER_WINDOW_MAX_HEIGHT = 520;
const REMINDER_WINDOW_WIDTH_RATIO = 0.3;
const REMINDER_WINDOW_HEIGHT_RATIO = 0.42;

function createWindowManager({ assetRootDir }) {
  const preloadPath = path.join(assetRootDir, "preload.js");
  const dashboardHtmlPath = path.join(assetRootDir, "src", "ui", "dashboard.html");
  const reminderHtmlPath = path.join(assetRootDir, "src", "ui", "reminder.html");

  let dashboardWindow = null;
  let reminderWindow = null;
  let allowDashboardClose = false;
  let allowReminderClose = false;
  let reminderReadyToShow = false;
  let reminderContentLoaded = false;
  let pendingReminderState = null;
  let closeHandlers = {
    onDashboardCloseRequest: null,
    onReminderCloseRequest: null
  };

  function baseWebPreferences() {
    return {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    };
  }

  function setReminderPosition(windowInstance, reminderConfig) {
    const display = screen.getPrimaryDisplay();
    const bounds = display.workArea;
    const [width, height] = windowInstance.getSize();
    const x = Math.max(bounds.x, bounds.x + bounds.width - width - REMINDER_WINDOW_MARGIN);
    const y = Math.max(bounds.y, bounds.y + bounds.height - height - REMINDER_WINDOW_MARGIN);
    if (reminderConfig.position === "bottom_right") {
      windowInstance.setPosition(x, y);
    }
  }

  function clampToRange(value, minValue, maxValue) {
    return Math.max(minValue, Math.min(value, maxValue));
  }

  function normalizeReminderWindowConfig(reminderConfig) {
    const display = screen.getPrimaryDisplay();
    const bounds = display.workArea;
    const maxWidth = Math.max(320, bounds.width - REMINDER_WINDOW_MARGIN * 2);
    const maxHeight = Math.max(320, bounds.height - REMINDER_WINDOW_MARGIN * 2);
    const preferredWidth = Math.max(
      reminderConfig.width,
      Math.round(bounds.width * REMINDER_WINDOW_WIDTH_RATIO)
    );
    const preferredHeight = Math.max(
      reminderConfig.height,
      Math.round(bounds.height * REMINDER_WINDOW_HEIGHT_RATIO)
    );
    const minWidth = Math.min(REMINDER_WINDOW_MIN_WIDTH, maxWidth);
    const minHeight = Math.min(REMINDER_WINDOW_MIN_HEIGHT, maxHeight);
    const boundedMaxWidth = Math.max(minWidth, Math.min(REMINDER_WINDOW_MAX_WIDTH, maxWidth));
    const boundedMaxHeight = Math.max(minHeight, Math.min(REMINDER_WINDOW_MAX_HEIGHT, maxHeight));

    return {
      ...reminderConfig,
      width: clampToRange(preferredWidth, minWidth, boundedMaxWidth),
      height: clampToRange(preferredHeight, minHeight, boundedMaxHeight)
    };
  }

  function revealReminderWindow(windowInstance) {
    if (!windowInstance || windowInstance.isDestroyed()) {
      return;
    }

    windowInstance.show();
    windowInstance.focus();
    windowInstance.setAlwaysOnTop(true, "screen-saver");
  }

  function flushPendingReminderState() {
    if (
      !reminderWindow ||
      reminderWindow.isDestroyed() ||
      !reminderContentLoaded ||
      !pendingReminderState
    ) {
      return;
    }

    reminderWindow.webContents.send("state:changed", pendingReminderState);
    pendingReminderState = null;
  }

  function ensureDashboardWindow(config) {
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      return dashboardWindow;
    }

    dashboardWindow = new BrowserWindow({
      width: config.mainWindow.width,
      height: config.mainWindow.height,
      minWidth: config.mainWindow.width,
      minHeight: config.mainWindow.height,
      show: false,
      title: "20-20-20 视力提醒器",
      webPreferences: baseWebPreferences()
    });

    dashboardWindow.loadFile(dashboardHtmlPath);
    dashboardWindow.once("ready-to-show", () => {
      dashboardWindow.show();
    });
    dashboardWindow.on("close", (event) => {
      if (allowDashboardClose) {
        return;
      }

      const result = closeHandlers.onDashboardCloseRequest
        ? closeHandlers.onDashboardCloseRequest()
        : { allowClose: true };
      if (!result || result.allowClose === false) {
        event.preventDefault();
      }
    });
    dashboardWindow.on("closed", () => {
      dashboardWindow = null;
    });

    return dashboardWindow;
  }

  function ensureReminderWindow(config) {
    if (reminderWindow && !reminderWindow.isDestroyed()) {
      return reminderWindow;
    }

    const reminderWindowConfig = normalizeReminderWindowConfig(config.reminderWindow);
    reminderReadyToShow = false;
    reminderContentLoaded = false;
    pendingReminderState = null;
    reminderWindow = new BrowserWindow({
      width: reminderWindowConfig.width,
      height: reminderWindowConfig.height,
      autoHideMenuBar: true,
      useContentSize: true,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      alwaysOnTop: true,
      show: false,
      title: "20-20-20 提醒",
      webPreferences: baseWebPreferences()
    });

    reminderWindow.loadFile(reminderHtmlPath);
    reminderWindow.webContents.on("did-finish-load", () => {
      reminderContentLoaded = true;
      flushPendingReminderState();
    });
    reminderWindow.once("ready-to-show", () => {
      reminderReadyToShow = true;
      revealReminderWindow(reminderWindow);
    });
    reminderWindow.on("close", (event) => {
      if (allowReminderClose) {
        return;
      }

      event.preventDefault();
      if (closeHandlers.onReminderCloseRequest) {
        closeHandlers.onReminderCloseRequest();
      }
    });
    reminderWindow.on("closed", () => {
      reminderWindow = null;
      allowReminderClose = false;
      reminderReadyToShow = false;
      reminderContentLoaded = false;
      pendingReminderState = null;
    });
    setReminderPosition(reminderWindow, reminderWindowConfig);

    return reminderWindow;
  }

  return {
    broadcastState(payload) {
      for (const windowInstance of [dashboardWindow, reminderWindow]) {
        if (!windowInstance || windowInstance.isDestroyed()) {
          continue;
        }
        windowInstance.webContents.send("state:changed", payload);
      }
    },
    closeReminder() {
      if (!reminderWindow || reminderWindow.isDestroyed()) {
        return;
      }
      allowReminderClose = true;
      reminderWindow.close();
    },
    ensureDashboardWindow,
    minimizeDashboard() {
      if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        dashboardWindow.minimize();
      }
    },
    prepareForQuit() {
      allowDashboardClose = true;
      allowReminderClose = true;
    },
    setCloseHandlers(handlers) {
      closeHandlers = {
        ...closeHandlers,
        ...handlers
      };
    },
    showReminder(reminder, config, initialState) {
      const reminderInstance = ensureReminderWindow(config);
      setReminderPosition(reminderInstance, normalizeReminderWindowConfig(config.reminderWindow));
      if (initialState) {
        pendingReminderState = initialState;
        flushPendingReminderState();
      }
      if (reminderReadyToShow) {
        revealReminderWindow(reminderInstance);
      }
    }
  };
}

module.exports = {
  createWindowManager
};
