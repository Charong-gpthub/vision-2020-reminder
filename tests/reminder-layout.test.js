const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("reminder stylesheet does not hard-clip content below the viewport", () => {
  const cssPath = path.join(__dirname, "..", "src", "ui", "reminder.css");
  const css = fs.readFileSync(cssPath, "utf8");

  assert.equal(css.includes("overflow: hidden;"), false);
  assert.equal(css.includes("min-height: calc(100vh - 32px);"), false);
});
