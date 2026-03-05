const test = require("node:test");
const assert = require("node:assert/strict");

const { createAppController } = require("../src/main/app-controller");

function createSchedulerStub() {
  let currentState = {
    anchorAt: "2026-03-06T09:00:00.000Z",
    nextDueAt: "2026-03-06T09:20:00.000Z",
    nextReason: "INTERVAL",
    activeReminder: null
  };

  return {
    getState() {
      return currentState;
    },
    tick(now) {
      if (now.toISOString() === "2026-03-06T09:20:00.000Z") {
        currentState = {
          ...currentState,
          activeReminder: {
            reminderId: "20260306-092000-001",
            reason: "INTERVAL",
            scheduledAt: now.toISOString(),
            shownAt: now.toISOString()
          }
        };
        return {
          type: "SHOW_REMINDER",
          reminder: currentState.activeReminder
        };
      }

      return null;
    },
    applyAction({ action }) {
      currentState = {
        ...currentState,
        activeReminder: null,
        nextDueAt: action === "SNOOZE" ? "2026-03-06T09:25:00.000Z" : "2026-03-06T09:40:00.000Z"
      };
    },
    updateConfig() {}
  };
}

function createControllerHarness() {
  const appended = [];
  const actions = [];
  const windowManager = {
    showReminder(reminder) {
      actions.push(["showReminder", reminder.reminderId]);
    },
    closeReminder() {
      actions.push(["closeReminder"]);
    },
    minimizeDashboard() {
      actions.push(["minimizeDashboard"]);
    },
    broadcastState() {
      actions.push(["broadcastState"]);
    }
  };

  const controller = createAppController({
    scheduler: createSchedulerStub(),
    configStore: {
      ensure() {
        return {
          env: "A",
          profile: "A1",
          intervalSec: 1200,
          countdownSec: 20,
          snoozeDefaultSec: 300,
          soundEnabled: true,
          mainWindow: { width: 420, height: 640 },
          reminderWindow: { width: 380, height: 240, position: "bottom_right" }
        };
      },
      updateConfig(partial) {
        return partial;
      }
    },
    logStore: {
      append(event) {
        appended.push(event);
      },
      readEventsForDate() {
        return appended;
      }
    },
    statsProvider: {
      getTodayStats() {
        return {
          dateKey: "2026-03-06",
          doneCount: 0,
          skipCount: 0,
          actionTotal: 0,
          completionRate: null,
          completionRateLabel: "N/A"
        };
      }
    },
    windowManager,
    shellAdapter: {
      openPath() {}
    },
    nowProvider: () => new Date("2026-03-06T09:00:00.000Z"),
    sessionIdFactory: () => "session-1"
  });

  controller.initialize();

  return { controller, appended, actions };
}

test("controller logs reminder shown and handles DONE action", () => {
  const { controller, appended, actions } = createControllerHarness();

  controller.handleTick(new Date("2026-03-06T09:20:00.000Z"));
  controller.handleReminderAction({
    reminderId: "20260306-092000-001",
    action: "DONE",
    elapsedSec: 6
  });

  assert.equal(appended[1].type, "REMINDER_SHOWN");
  assert.equal(appended[2].type, "ACTION");
  assert.equal(appended[2].action, "DONE");
  assert.deepEqual(actions, [
    ["broadcastState"],
    ["showReminder", "20260306-092000-001"],
    ["broadcastState"],
    ["closeReminder"],
    ["broadcastState"]
  ]);
});

test("controller minimizes the dashboard instead of closing the app window", () => {
  const { controller, actions } = createControllerHarness();

  const result = controller.handleDashboardCloseRequest();

  assert.equal(result.allowClose, false);
  assert.deepEqual(actions, [
    ["broadcastState"],
    ["minimizeDashboard"]
  ]);
});

test("controller treats the reminder window close button as SKIP", () => {
  const { controller, appended, actions } = createControllerHarness();

  controller.handleTick(new Date("2026-03-06T09:20:00.000Z"));
  controller.handleReminderWindowClosed();

  assert.equal(appended[2].action, "SKIP");
  assert.equal(appended[2].source, "window_close");
  assert.deepEqual(actions, [
    ["broadcastState"],
    ["showReminder", "20260306-092000-001"],
    ["broadcastState"],
    ["closeReminder"],
    ["broadcastState"]
  ]);
});
