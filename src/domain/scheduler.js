const { buildReminder, createReminderId } = require("./reminder-state");
const { toDate } = require("./time");

function computeNextIntervalSlot({ anchorAt, intervalSec, now }) {
  const anchorMs = toDate(anchorAt).getTime();
  const nowMs = toDate(now).getTime();
  const intervalMs = intervalSec * 1000;
  const slotIndex = Math.floor((nowMs - anchorMs) / intervalMs) + 1;
  return new Date(anchorMs + Math.max(slotIndex, 1) * intervalMs);
}

function createScheduler({
  launchAt,
  intervalSec,
  snoozeDefaultSec,
  overdueGapMs = 15_000
}) {
  const launchDate = toDate(launchAt);
  let intervalMs = intervalSec * 1000;
  let snoozeDefaultMs = snoozeDefaultSec * 1000;
  let anchorAtMs = launchDate.getTime();
  let nextDueAtMs = anchorAtMs + intervalMs;
  let nextReason = "INTERVAL";
  let activeReminder = null;
  let reminderSequence = 0;
  let lastTickAtMs = launchDate.getTime();
  let pendingParentReminderId = null;

  function getState(now = new Date()) {
    const nowMs = toDate(now).getTime();
    return {
      anchorAt: new Date(anchorAtMs).toISOString(),
      nextDueAt: new Date(nextDueAtMs).toISOString(),
      nextReason,
      activeReminder,
      msUntilDue: Math.max(0, nextDueAtMs - nowMs)
    };
  }

  function issueReminder(now) {
    const nowDate = toDate(now);
    if (nextReason === "SNOOZE") {
      anchorAtMs = nowDate.getTime();
    }

    reminderSequence += 1;
    activeReminder = buildReminder({
      reminderId: createReminderId({
        shownAt: nowDate,
        sequence: reminderSequence
      }),
      scheduledAt: new Date(nextDueAtMs),
      shownAt: nowDate,
      reason: nextReason,
      parentReminderId: pendingParentReminderId
    });
    pendingParentReminderId = null;

    return {
      type: "SHOW_REMINDER",
      reminder: activeReminder
    };
  }

  function tick(now = new Date()) {
    const nowDate = toDate(now);
    const nowMs = nowDate.getTime();
    const gapMs = nowMs - lastTickAtMs;
    lastTickAtMs = nowMs;

    if (activeReminder) {
      return null;
    }

    if (nextReason === "INTERVAL" && gapMs > overdueGapMs && nowMs >= nextDueAtMs) {
      nextDueAtMs = nowMs;
      nextReason = "OVERDUE_RESUME";
    }

    if (nowMs >= nextDueAtMs) {
      return issueReminder(nowDate);
    }

    return null;
  }

  function applyAction({
    reminderId,
    action,
    now = new Date(),
    snoozeSec = null
  }) {
    if (!activeReminder || activeReminder.reminderId !== reminderId) {
      return getState(now);
    }

    const nowDate = toDate(now);
    const nowMs = nowDate.getTime();

    if (action === "SNOOZE") {
      nextDueAtMs = nowMs + (snoozeSec || snoozeDefaultMs / 1000) * 1000;
      nextReason = "SNOOZE";
      pendingParentReminderId = activeReminder.reminderId;
    } else {
      nextDueAtMs = computeNextIntervalSlot({
        anchorAt: new Date(anchorAtMs),
        intervalSec: intervalMs / 1000,
        now: nowDate
      }).getTime();
      nextReason = "INTERVAL";
      pendingParentReminderId = null;
    }

    activeReminder = null;
    return getState(nowDate);
  }

  function updateConfig(nextConfig, now = new Date()) {
    const nowDate = toDate(now);
    const nowMs = nowDate.getTime();
    const previousIntervalMs = intervalMs;
    intervalMs = nextConfig.intervalSec * 1000;
    snoozeDefaultMs = nextConfig.snoozeDefaultSec * 1000;
    lastTickAtMs = nowMs;

    if (previousIntervalMs !== intervalMs) {
      anchorAtMs = nowMs;
      nextDueAtMs = nowMs + intervalMs;
      nextReason = "INTERVAL";
      pendingParentReminderId = null;
    }

    return getState(nowDate);
  }

  return {
    applyAction,
    getState,
    tick,
    updateConfig
  };
}

module.exports = {
  computeNextIntervalSlot,
  createScheduler
};
