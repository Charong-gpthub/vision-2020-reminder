const { formatLocalDateKey, toDate } = require("./time");

function calculateStatsForDate({ dateKey, events }) {
  let doneCount = 0;
  let skipCount = 0;

  for (const event of events) {
    if (!event || event.type !== "ACTION") {
      continue;
    }

    if (formatLocalDateKey(toDate(event.ts)) !== dateKey) {
      continue;
    }

    if (event.action === "DONE") {
      doneCount += 1;
    } else if (event.action === "SKIP") {
      skipCount += 1;
    }
  }

  const actionTotal = doneCount + skipCount;
  const completionRate = actionTotal > 0 ? doneCount / actionTotal : null;
  const completionRateLabel = completionRate === null ? "N/A" : `${Math.round(completionRate * 100)}%`;

  return {
    dateKey,
    doneCount,
    skipCount,
    actionTotal,
    completionRate,
    completionRateLabel
  };
}

function createStatsProvider({ logStore }) {
  return {
    getTodayStats({ now = new Date() } = {}) {
      const dateKey = formatLocalDateKey(now);
      const events = logStore.readEventsForDate(dateKey);
      return calculateStatsForDate({
        dateKey,
        events
      });
    }
  };
}

module.exports = {
  calculateStatsForDate,
  createStatsProvider
};
