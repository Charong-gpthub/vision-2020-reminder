const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_CONFIG = {
  env: "A",
  profile: "A1",
  startupMessage: "让提醒稳定出现，但不过度打扰。",
  intervalSec: 1200,
  countdownSec: 20,
  snoozeDefaultSec: 300,
  soundEnabled: true,
  mainWindow: {
    width: 420,
    height: 640
  },
  reminderWindow: {
    width: 380,
    height: 240,
    position: "bottom_right"
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepMerge(base, patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return patch === undefined ? clone(base) : patch;
  }

  const output = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      base &&
      typeof base[key] === "object" &&
      !Array.isArray(base[key])
    ) {
      output[key] = deepMerge(base[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function createConfigStore({ rootDir, dataDir = path.join(rootDir, "data") }) {
  const configPath = path.join(dataDir, "config.json");
  const logsDir = path.join(dataDir, "logs");

  function writeConfig(config) {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(logsDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  function ensure() {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(logsDir, { recursive: true });
    if (!fs.existsSync(configPath)) {
      writeConfig(clone(DEFAULT_CONFIG));
    }

    return readConfig();
  }

  function readConfig() {
    const raw = fs.readFileSync(configPath, "utf8");
    return deepMerge(clone(DEFAULT_CONFIG), JSON.parse(raw));
  }

  function updateConfig(partialConfig) {
    const current = ensure();
    const next = deepMerge(current, partialConfig);
    writeConfig(next);
    return next;
  }

  return {
    ensure,
    getConfigPath() {
      return configPath;
    },
    getDataDir() {
      return dataDir;
    },
    getLogsDir() {
      return logsDir;
    },
    updateConfig
  };
}

module.exports = {
  DEFAULT_CONFIG,
  createConfigStore
};
