function formatDateTime(isoValue) {
  if (!isoValue) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(isoValue));
}

function formatCountdown(msUntilDue) {
  if (msUntilDue === null || msUntilDue === undefined) {
    return "--:--";
  }

  const totalSeconds = Math.max(0, Math.ceil(msUntilDue / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatIntervalMinutes(intervalSec) {
  const minutes = Number(intervalSec) / 60;
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "20";
  }

  if (Number.isInteger(minutes)) {
    return String(minutes);
  }

  return String(Number(minutes.toFixed(2)));
}

function parseIntervalSeconds(rawValue) {
  const minutes = Number.parseFloat(String(rawValue).trim());
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return null;
  }

  return Math.round(minutes * 60);
}

const elements = {
  sessionMeta: document.getElementById("session-meta"),
  nextDue: document.getElementById("next-due"),
  nextReason: document.getElementById("next-reason"),
  countdown: document.getElementById("countdown"),
  doneCount: document.getElementById("done-count"),
  skipCount: document.getElementById("skip-count"),
  completionRate: document.getElementById("completion-rate"),
  actionTotal: document.getElementById("action-total"),
  intervalForm: document.getElementById("interval-form"),
  intervalMinutes: document.getElementById("interval-minutes"),
  intervalFeedback: document.getElementById("interval-feedback"),
  soundEnabled: document.getElementById("sound-enabled"),
  openDataDir: document.getElementById("open-data-dir"),
  quitApp: document.getElementById("quit-app")
};

let unsubscribe = null;
let latestState = null;

function render(state) {
  latestState = state;
  const { config, session, schedulerState, todayStats } = state;
  elements.sessionMeta.textContent =
    `会话 ${session.sessionId.slice(0, 8)} · 启动于 ${formatDateTime(session.launchAt)}`;
  elements.nextDue.textContent = formatDateTime(schedulerState.nextDueAt);
  elements.nextReason.textContent = schedulerState.nextReason || "--";
  elements.countdown.textContent = formatCountdown(schedulerState.msUntilDue);
  elements.doneCount.textContent = String(todayStats.doneCount);
  elements.skipCount.textContent = String(todayStats.skipCount);
  elements.completionRate.textContent = todayStats.completionRateLabel;
  elements.actionTotal.textContent = `${todayStats.actionTotal} 次有效动作`;
  elements.soundEnabled.checked = Boolean(config.soundEnabled);
  if (document.activeElement !== elements.intervalMinutes) {
    elements.intervalMinutes.value = formatIntervalMinutes(config.intervalSec);
  }
}

async function bootstrap() {
  const state = await window.visionApi.getBootstrap();
  render(state);
  unsubscribe = window.visionApi.onStateChanged((nextState) => render(nextState));
}

elements.soundEnabled.addEventListener("change", async (event) => {
  await window.visionApi.updateSettings({
    soundEnabled: event.target.checked
  });
});

elements.intervalMinutes.addEventListener("input", () => {
  elements.intervalFeedback.textContent = "";
});

elements.intervalForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const intervalSec = parseIntervalSeconds(elements.intervalMinutes.value);
  if (intervalSec === null) {
    if (latestState) {
      elements.intervalMinutes.value = formatIntervalMinutes(latestState.config.intervalSec);
    }
    elements.intervalFeedback.textContent = "请输入大于 0 的分钟数";
    return;
  }

  if (latestState && intervalSec === latestState.config.intervalSec) {
    elements.intervalFeedback.textContent = "间隔未变化";
    return;
  }

  elements.intervalFeedback.textContent = "保存中...";

  try {
    const updatedConfig = await window.visionApi.updateSettings({ intervalSec });
    if (latestState) {
      render({
        ...latestState,
        config: updatedConfig
      });
    } else {
      elements.intervalMinutes.value = formatIntervalMinutes(updatedConfig.intervalSec);
    }
    elements.intervalFeedback.textContent = `已保存为 ${formatIntervalMinutes(updatedConfig.intervalSec)} 分钟`;
  } catch (_error) {
    elements.intervalFeedback.textContent = "保存失败，请重试";
  }
});

elements.openDataDir.addEventListener("click", () => {
  window.visionApi.openDataDir();
});

elements.quitApp.addEventListener("click", () => {
  window.visionApi.quitApp();
});

window.addEventListener("beforeunload", () => {
  if (typeof unsubscribe === "function") {
    unsubscribe();
  }
});

bootstrap();
