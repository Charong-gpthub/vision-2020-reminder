const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

function createEventHub() {
  const listeners = new Map();
  const onceListeners = new Map();

  return {
    on(eventName, listener) {
      const eventListeners = listeners.get(eventName) || [];
      eventListeners.push(listener);
      listeners.set(eventName, eventListeners);
    },
    once(eventName, listener) {
      const eventListeners = onceListeners.get(eventName) || [];
      eventListeners.push(listener);
      onceListeners.set(eventName, eventListeners);
    },
    emit(eventName, ...args) {
      for (const listener of listeners.get(eventName) || []) {
        listener(...args);
      }

      const oneTimeListeners = onceListeners.get(eventName) || [];
      onceListeners.delete(eventName);
      for (const listener of oneTimeListeners) {
        listener(...args);
      }
    }
  };
}

function loadWindowManagerWithFakes() {
  const createdWindows = [];

  class FakeBrowserWindow {
    constructor(options) {
      this.options = options;
      this.destroyed = false;
      this.size = [options.width, options.height];
      this.showCount = 0;
      this.focusCount = 0;
      this.sentMessages = [];
      this.position = null;
      this.windowEvents = createEventHub();
      this.webContentsEvents = createEventHub();
      this.webContents = {
        on: this.webContentsEvents.on.bind(this.webContentsEvents),
        once: this.webContentsEvents.once.bind(this.webContentsEvents),
        send: (channel, payload) => {
          this.sentMessages.push([channel, payload]);
        }
      };
      createdWindows.push(this);
    }

    close() {
      const event = {
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true;
        }
      };
      this.windowEvents.emit("close", event);
      if (!event.defaultPrevented) {
        this.destroyed = true;
        this.windowEvents.emit("closed");
      }
    }

    emit(eventName, ...args) {
      this.windowEvents.emit(eventName, ...args);
    }

    focus() {
      this.focusCount += 1;
    }

    getSize() {
      return this.size;
    }

    isDestroyed() {
      return this.destroyed;
    }

    loadFile(filePath) {
      this.loadedFile = filePath;
    }

    on(eventName, listener) {
      this.windowEvents.on(eventName, listener);
    }

    once(eventName, listener) {
      this.windowEvents.once(eventName, listener);
    }

    setAlwaysOnTop() {}

    setPosition(x, y) {
      this.position = [x, y];
    }

    show() {
      this.showCount += 1;
    }
  }

  const fakeElectronMain = {
    BrowserWindow: FakeBrowserWindow,
    screen: {
      getPrimaryDisplay() {
        return {
          workArea: { x: 0, y: 0, width: 1600, height: 900 }
        };
      }
    }
  };

  const modulePath = path.resolve(__dirname, "..", "src", "main", "window-manager.js");
  delete require.cache[modulePath];

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "electron/main") {
      return fakeElectronMain;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return {
      ...require("../src/main/window-manager"),
      createdWindows
    };
  } finally {
    Module._load = originalLoad;
  }
}

function createConfig() {
  return {
    mainWindow: { width: 420, height: 640 },
    reminderWindow: { width: 380, height: 240, position: "bottom_right" }
  };
}

test("showReminder waits for ready-to-show before displaying a new reminder window", () => {
  const { createWindowManager, createdWindows } = loadWindowManagerWithFakes();
  const manager = createWindowManager({ assetRootDir: "C:\\fake-root" });

  manager.showReminder({ reminderId: "r-1" }, createConfig(), {
    schedulerState: { activeReminder: { reminderId: "r-1" } }
  });

  const reminderWindow = createdWindows[0];
  assert.equal(reminderWindow.showCount, 0);

  reminderWindow.emit("ready-to-show");
  assert.equal(reminderWindow.showCount, 1);
});

test("showReminder buffers initial state until reminder content finishes loading", () => {
  const { createWindowManager, createdWindows } = loadWindowManagerWithFakes();
  const manager = createWindowManager({ assetRootDir: "C:\\fake-root" });
  const initialState = {
    schedulerState: {
      activeReminder: { reminderId: "r-2" }
    }
  };

  manager.showReminder({ reminderId: "r-2" }, createConfig(), initialState);

  const reminderWindow = createdWindows[0];
  assert.deepEqual(reminderWindow.sentMessages, []);

  reminderWindow.webContentsEvents.emit("did-finish-load");
  assert.deepEqual(reminderWindow.sentMessages, [["state:changed", initialState]]);
});
