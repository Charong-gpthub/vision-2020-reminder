function toDate(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  return new Date(value);
}

function toIsoString(value) {
  return toDate(value).toISOString();
}

function pad(value, width = 2) {
  return String(value).padStart(width, "0");
}

function formatLocalDateKey(value) {
  const date = toDate(value);
  return [
    pad(date.getFullYear(), 4),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-");
}

function formatReminderStamp(value) {
  const date = toDate(value);
  return [
    pad(date.getUTCFullYear(), 4),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate())
  ].join("") +
    "-" +
    [
      pad(date.getUTCHours()),
      pad(date.getUTCMinutes()),
      pad(date.getUTCSeconds())
    ].join("");
}

module.exports = {
  formatLocalDateKey,
  formatReminderStamp,
  toDate,
  toIsoString
};
