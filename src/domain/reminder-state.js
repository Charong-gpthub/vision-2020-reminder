const crypto = require("node:crypto");

const { formatReminderStamp, toIsoString } = require("./time");

function createSessionId() {
  return crypto.randomUUID();
}

function createReminderId({ shownAt, sequence }) {
  return `${formatReminderStamp(shownAt)}-${String(sequence).padStart(3, "0")}`;
}

function buildReminder({
  reminderId,
  scheduledAt,
  shownAt,
  reason,
  parentReminderId = null
}) {
  return {
    reminderId,
    scheduledAt: toIsoString(scheduledAt),
    shownAt: toIsoString(shownAt),
    reason,
    parentReminderId
  };
}

module.exports = {
  buildReminder,
  createReminderId,
  createSessionId
};
