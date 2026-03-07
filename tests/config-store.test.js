const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createConfigStore } = require("../src/storage/config-store");

test("config store backfills the default startup message for existing configs", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "vision-2020-config-"));
  const dataDir = path.join(rootDir, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, "config.json"),
    JSON.stringify({
      env: "A",
      profile: "A1",
      intervalSec: 1500
    })
  );

  const store = createConfigStore({ rootDir, dataDir });
  const config = store.ensure();

  assert.equal(config.startupMessage, "让提醒稳定出现，但不过度打扰。");
  assert.equal(config.intervalSec, 1500);
});
