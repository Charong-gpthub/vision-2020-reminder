const test = require("node:test");
const assert = require("node:assert/strict");

const { calculateStatsForDate } = require("../src/domain/stats");

test("stats count only DONE and SKIP actions toward completion rate", () => {
  const stats = calculateStatsForDate({
    dateKey: "2026-03-06",
    events: [
      { ts: "2026-03-06T09:20:00.000Z", type: "ACTION", action: "DONE" },
      { ts: "2026-03-06T09:40:00.000Z", type: "ACTION", action: "SKIP" },
      { ts: "2026-03-06T10:00:00.000Z", type: "ACTION", action: "SNOOZE" },
      { ts: "2026-03-05T10:00:00.000Z", type: "ACTION", action: "DONE" }
    ]
  });

  assert.deepEqual(stats, {
    dateKey: "2026-03-06",
    doneCount: 1,
    skipCount: 1,
    actionTotal: 2,
    completionRate: 0.5,
    completionRateLabel: "50%"
  });
});

test("stats expose N/A when there are no DONE or SKIP actions", () => {
  const stats = calculateStatsForDate({
    dateKey: "2026-03-06",
    events: [
      { ts: "2026-03-06T09:20:00.000Z", type: "ACTION", action: "SNOOZE" }
    ]
  });

  assert.equal(stats.doneCount, 0);
  assert.equal(stats.skipCount, 0);
  assert.equal(stats.actionTotal, 0);
  assert.equal(stats.completionRate, null);
  assert.equal(stats.completionRateLabel, "N/A");
});
