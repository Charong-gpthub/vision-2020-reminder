const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const scriptsDir = path.join(projectRoot, "scripts");

function readScript(fileName) {
  return fs.readFileSync(path.join(scriptsDir, fileName), "utf8");
}

function resolveToolPath(scriptSource) {
  const match = scriptSource.match(/"%~dp0([^"]+)"/);
  assert.ok(match, "script should invoke a tool path from %~dp0");
  const rawRelativePath = match[1].replace(/\\/g, path.sep);
  return path.resolve(scriptsDir, rawRelativePath);
}

test("run-electron launcher points at a real Electron binary and restores project root", () => {
  const source = readScript("run-electron.cmd");
  const resolvedToolPath = resolveToolPath(source);

  assert.equal(fs.existsSync(resolvedToolPath), true);
  assert.match(source, /pushd "%~dp0\.\."/i);
  assert.match(source, /popd/i);
});

test("package-electron launcher points at a real packager binary and restores project root", () => {
  const source = readScript("package-electron.cmd");
  const resolvedToolPath = resolveToolPath(source);

  assert.equal(fs.existsSync(resolvedToolPath), true);
  assert.match(source, /pushd "%~dp0\.\."/i);
  assert.match(source, /popd/i);
});
