const fs = require("node:fs");
const path = require("node:path");

const { formatLocalDateKey } = require("../domain/time");

function createLogStore({ rootDir }) {
  const logsDir = path.join(rootDir, "logs");

  function ensureLogDir() {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  function getFilePathForDate(dateKey) {
    return path.join(logsDir, `${dateKey}.jsonl`);
  }

  function append(event) {
    ensureLogDir();
    const dateKey = formatLocalDateKey(event.ts);
    const filePath = getFilePathForDate(dateKey);
    const line = `${JSON.stringify(event)}\n`;
    const fileHandle = fs.openSync(filePath, "a");
    try {
      fs.writeSync(fileHandle, line);
      fs.fsyncSync(fileHandle);
    } finally {
      fs.closeSync(fileHandle);
    }
  }

  function readEventsForDate(dateKey) {
    ensureLogDir();
    const filePath = getFilePathForDate(dateKey);
    if (!fs.existsSync(filePath)) {
      return [];
    }

    return fs
      .readFileSync(filePath, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  return {
    append,
    getLogsDir() {
      return logsDir;
    },
    readEventsForDate
  };
}

module.exports = {
  createLogStore
};
