const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createLogStore } = require("../src/storage/log-store");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "vision-log-store-"));
}

test("log store appends newline-delimited JSON and flushes each write", () => {
  const rootDir = createTempDir();
  const store = createLogStore({ rootDir });

  store.append({
    ts: "2026-03-06T09:20:00.000Z",
    type: "SESSION_STARTED",
    sessionId: "session-1"
  });
  store.append({
    ts: "2026-03-06T09:20:05.000Z",
    type: "REMINDER_SHOWN",
    reminderId: "reminder-1"
  });

  const filePath = path.join(rootDir, "logs", "2026-03-06.jsonl");
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.trim().split("\n");

  assert.equal(lines.length, 2);
  assert.deepEqual(JSON.parse(lines[0]), {
    ts: "2026-03-06T09:20:00.000Z",
    type: "SESSION_STARTED",
    sessionId: "session-1"
  });
  assert.deepEqual(JSON.parse(lines[1]), {
    ts: "2026-03-06T09:20:05.000Z",
    type: "REMINDER_SHOWN",
    reminderId: "reminder-1"
  });
});

test("log store rolls over to a new file when the event date changes", () => {
  const rootDir = createTempDir();
  const store = createLogStore({ rootDir });

  store.append({
    ts: "2026-03-06T23:59:58.000+08:00",
    type: "ACTION",
    action: "DONE",
    reminderId: "reminder-a"
  });
  store.append({
    ts: "2026-03-07T00:00:02.000+08:00",
    type: "ACTION",
    action: "SKIP",
    reminderId: "reminder-b"
  });

  assert.equal(fs.existsSync(path.join(rootDir, "logs", "2026-03-06.jsonl")), true);
  assert.equal(fs.existsSync(path.join(rootDir, "logs", "2026-03-07.jsonl")), true);
});
