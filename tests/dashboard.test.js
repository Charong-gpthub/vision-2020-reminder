const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class FakeElement {
  constructor(id) {
    this.id = id;
    this.checked = false;
    this.textContent = "";
    this.value = "";
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const existing = this.listeners.get(type) || [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  async dispatch(type, event = {}) {
    const listeners = this.listeners.get(type) || [];
    for (const listener of listeners) {
      await listener({
        target: this,
        preventDefault() {},
        ...event
      });
    }
  }
}

function createBootstrapState() {
  return {
    config: {
      env: "A",
      profile: "A1",
      startupMessage: "让提醒稳定出现，但不过度打扰。",
      intervalSec: 1200,
      countdownSec: 20,
      snoozeDefaultSec: 300,
      soundEnabled: true,
      mainWindow: { width: 420, height: 640 },
      reminderWindow: { width: 380, height: 240, position: "bottom_right" }
    },
    session: {
      sessionId: "session-12345678",
      launchAt: "2026-03-06T09:00:00.000Z"
    },
    schedulerState: {
      nextDueAt: "2026-03-06T09:20:00.000Z",
      nextReason: "INTERVAL",
      msUntilDue: 1_200_000
    },
    todayStats: {
      doneCount: 0,
      skipCount: 0,
      completionRateLabel: "N/A",
      actionTotal: 0
    }
  };
}

async function loadDashboard() {
  const ids = [
    "startup-message-heading",
    "session-meta",
    "next-due",
    "next-reason",
    "countdown",
    "done-count",
    "skip-count",
    "completion-rate",
    "action-total",
    "sound-enabled",
    "open-data-dir",
    "quit-app",
    "interval-form",
    "interval-minutes",
    "interval-feedback",
    "startup-message-form",
    "startup-message-input",
    "startup-message-feedback"
  ];

  const elementMap = new Map(ids.map((id) => [id, new FakeElement(id)]));
  const savedSettings = [];
  const bootstrapState = createBootstrapState();
  const document = {
    activeElement: null,
    getElementById(id) {
      return elementMap.get(id) || null;
    }
  };

  const context = vm.createContext({
    console,
    Date,
    Intl,
    document,
    setTimeout,
    clearTimeout,
    window: {
      addEventListener() {},
      visionApi: {
        getBootstrap: async () => bootstrapState,
        onStateChanged: () => () => {},
        openDataDir() {},
        quitApp() {},
        updateSettings: async (payload) => {
          savedSettings.push(payload);
          return {
            ...bootstrapState.config,
            ...payload
          };
        }
      }
    }
  });

  const scriptPath = path.join(__dirname, "..", "src", "ui", "dashboard.js");
  const source = fs.readFileSync(scriptPath, "utf8");
  vm.runInContext(source, context);
  await new Promise((resolve) => setImmediate(resolve));

  return {
    elements: Object.fromEntries(elementMap),
    savedSettings
  };
}

test("dashboard bootstrap renders interval minutes from config", async () => {
  const { elements } = await loadDashboard();

  assert.equal(elements["interval-minutes"].value, "20");
});

test("dashboard bootstrap renders startup message from config", async () => {
  const { elements } = await loadDashboard();

  assert.equal(elements["startup-message-heading"].textContent, "让提醒稳定出现，但不过度打扰。");
  assert.equal(elements["startup-message-input"].value, "让提醒稳定出现，但不过度打扰。");
});

test("dashboard submits updated interval minutes as intervalSec", async () => {
  const { elements, savedSettings } = await loadDashboard();

  elements["interval-minutes"].value = "30";
  await elements["interval-form"].dispatch("submit");

  assert.equal(savedSettings.length, 1);
  assert.equal(savedSettings[0].intervalSec, 1800);
});

test("dashboard submits updated startup message as startupMessage", async () => {
  const { elements, savedSettings } = await loadDashboard();

  elements["startup-message-input"].value = "先看远处，再回来继续。";
  await elements["startup-message-form"].dispatch("submit");

  assert.equal(savedSettings.length, 1);
  assert.equal(savedSettings[0].startupMessage, "先看远处，再回来继续。");
  assert.equal(elements["startup-message-heading"].textContent, "先看远处，再回来继续。");
});
