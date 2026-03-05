const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const projectDir = path.resolve(__dirname, "..");
const electronCli = path.resolve(
  projectDir,
  "..",
  "20260226work001",
  "cognitive-training",
  "node_modules",
  "electron",
  "cli.js"
);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vision-2020-smoke-"));
  const dataDir = path.join(tempRoot, "data");
  const childEnv = {
    ...process.env,
    VISION2020_DATA_DIR: dataDir,
    VISION2020_AUTOMATION: "1",
    VISION2020_AUTOMATION_ACTION: "DONE",
    VISION2020_AUTOMATION_DELAY_MS: "600"
  };
  delete childEnv.ELECTRON_RUN_AS_NODE;

  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, "config.json"),
    JSON.stringify(
      {
        env: "A",
        profile: "A1",
        intervalSec: 2,
        countdownSec: 2,
        snoozeDefaultSec: 1,
        soundEnabled: false,
        mainWindow: { width: 420, height: 640 },
        reminderWindow: { width: 380, height: 240, position: "bottom_right" }
      },
      null,
      2
    )
  );

  const child = spawn(process.execPath, [electronCli, "."], {
    cwd: projectDir,
    env: childEnv,
    stdio: "inherit"
  });

  const start = Date.now();
  let success = false;
  while (Date.now() - start < 20_000) {
    const logsDir = path.join(dataDir, "logs");
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir);
      if (files.length > 0) {
        const content = fs.readFileSync(path.join(logsDir, files[0]), "utf8");
        if (
          content.includes("\"SESSION_STARTED\"") &&
          content.includes("\"REMINDER_SHOWN\"") &&
          content.includes("\"DONE\"")
        ) {
          success = true;
          break;
        }
      }
    }
    await wait(500);
  }

  child.kill();

  if (!success) {
    throw new Error("Smoke launch did not produce the expected reminder flow.");
  }

  console.log(`Smoke launch succeeded. Data dir: ${dataDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
