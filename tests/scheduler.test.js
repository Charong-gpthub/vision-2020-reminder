const test = require("node:test");
const assert = require("node:assert/strict");

const { createScheduler } = require("../src/domain/scheduler");

test("scheduler schedules first reminder one interval after launch", () => {
  const launchAt = new Date("2026-03-06T09:00:00.000Z");
  const scheduler = createScheduler({
    launchAt,
    intervalSec: 1200,
    snoozeDefaultSec: 300
  });

  const state = scheduler.getState(new Date("2026-03-06T09:00:05.000Z"));

  assert.equal(state.anchorAt, "2026-03-06T09:00:00.000Z");
  assert.equal(state.nextDueAt, "2026-03-06T09:20:00.000Z");
  assert.equal(state.nextReason, "INTERVAL");
});

test("scheduler starts the next interval from the reminder close time after DONE", () => {
  const scheduler = createScheduler({
    launchAt: new Date("2026-03-06T09:00:00.000Z"),
    intervalSec: 1200,
    snoozeDefaultSec: 300
  });

  const due = scheduler.tick(new Date("2026-03-06T09:20:00.000Z"));
  scheduler.applyAction({
    reminderId: due.reminder.reminderId,
    action: "DONE",
    elapsedSec: 12,
    now: new Date("2026-03-06T09:20:12.000Z")
  });

  const state = scheduler.getState(new Date("2026-03-06T09:20:12.000Z"));
  assert.equal(state.anchorAt, "2026-03-06T09:20:12.000Z");
  assert.equal(state.nextDueAt, "2026-03-06T09:40:12.000Z");
  assert.equal(state.msUntilDue, 1_200_000);
});

test("scheduler emits a snoozed reminder and resets the cadence anchor when that reminder is shown", () => {
  const scheduler = createScheduler({
    launchAt: new Date("2026-03-06T09:00:00.000Z"),
    intervalSec: 1200,
    snoozeDefaultSec: 300
  });

  const firstDue = scheduler.tick(new Date("2026-03-06T09:20:00.000Z"));
  assert.equal(firstDue.type, "SHOW_REMINDER");
  scheduler.applyAction({
    reminderId: firstDue.reminder.reminderId,
    action: "SNOOZE",
    elapsedSec: 3,
    now: new Date("2026-03-06T09:20:03.000Z")
  });

  const snoozedDue = scheduler.tick(new Date("2026-03-06T09:25:03.000Z"));
  assert.equal(snoozedDue.reminder.reason, "SNOOZE");

  const stateAfterSnooze = scheduler.getState(new Date("2026-03-06T09:25:03.000Z"));
  assert.equal(stateAfterSnooze.anchorAt, "2026-03-06T09:25:03.000Z");

  scheduler.applyAction({
    reminderId: snoozedDue.reminder.reminderId,
    action: "DONE",
    elapsedSec: 8,
    now: new Date("2026-03-06T09:25:11.000Z")
  });

  const stateAfterDone = scheduler.getState(new Date("2026-03-06T09:25:11.000Z"));
  assert.equal(stateAfterDone.anchorAt, "2026-03-06T09:25:11.000Z");
  assert.equal(stateAfterDone.nextDueAt, "2026-03-06T09:45:11.000Z");
  assert.equal(stateAfterDone.nextReason, "INTERVAL");
});

test("scheduler emits a single overdue resume reminder after a long clock gap", () => {
  const scheduler = createScheduler({
    launchAt: new Date("2026-03-06T09:00:00.000Z"),
    intervalSec: 1200,
    snoozeDefaultSec: 300,
    overdueGapMs: 15000
  });

  scheduler.tick(new Date("2026-03-06T09:00:01.000Z"));
  const overdue = scheduler.tick(new Date("2026-03-06T09:40:30.000Z"));

  assert.equal(overdue.type, "SHOW_REMINDER");
  assert.equal(overdue.reminder.reason, "OVERDUE_RESUME");
  assert.equal(overdue.reminder.scheduledAt, "2026-03-06T09:40:30.000Z");

  scheduler.applyAction({
    reminderId: overdue.reminder.reminderId,
    action: "SKIP",
    elapsedSec: 0,
    now: new Date("2026-03-06T09:40:35.000Z")
  });

  const state = scheduler.getState(new Date("2026-03-06T09:40:35.000Z"));
  assert.equal(state.anchorAt, "2026-03-06T09:40:35.000Z");
  assert.equal(state.nextDueAt, "2026-03-06T10:00:35.000Z");
  assert.equal(state.nextReason, "INTERVAL");
});

test("scheduler resets countdown and next due from the config save time", () => {
  const scheduler = createScheduler({
    launchAt: new Date("2026-03-06T09:00:00.000Z"),
    intervalSec: 1200,
    snoozeDefaultSec: 300
  });

  const state = scheduler.updateConfig(
    {
      intervalSec: 600,
      snoozeDefaultSec: 300
    },
    new Date("2026-03-06T09:05:00.000Z")
  );

  assert.equal(state.anchorAt, "2026-03-06T09:05:00.000Z");
  assert.equal(state.nextDueAt, "2026-03-06T09:15:00.000Z");
  assert.equal(state.msUntilDue, 600_000);
  assert.equal(state.nextReason, "INTERVAL");
});

test("scheduler resets from config save time even when a snooze was pending", () => {
  const scheduler = createScheduler({
    launchAt: new Date("2026-03-06T09:00:00.000Z"),
    intervalSec: 1200,
    snoozeDefaultSec: 300
  });

  const firstDue = scheduler.tick(new Date("2026-03-06T09:20:00.000Z"));
  scheduler.applyAction({
    reminderId: firstDue.reminder.reminderId,
    action: "SNOOZE",
    elapsedSec: 2,
    now: new Date("2026-03-06T09:20:02.000Z")
  });

  const state = scheduler.updateConfig(
    {
      intervalSec: 900,
      snoozeDefaultSec: 300
    },
    new Date("2026-03-06T09:22:00.000Z")
  );

  assert.equal(state.anchorAt, "2026-03-06T09:22:00.000Z");
  assert.equal(state.nextDueAt, "2026-03-06T09:37:00.000Z");
  assert.equal(state.msUntilDue, 900_000);
  assert.equal(state.nextReason, "INTERVAL");
});
