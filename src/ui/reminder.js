const countdownElement = document.getElementById("countdown");
const helperTextElement = document.getElementById("helper-text");
const doneButton = document.getElementById("done-button");
const skipButton = document.getElementById("skip-button");
const snoozeButton = document.getElementById("snooze-button");

let currentState = null;
let currentReminderId = null;
let countdownTimer = null;
let unsubscribe = null;

function elapsedSeconds(reminder) {
  if (!reminder) {
    return 0;
  }

  const shownAt = new Date(reminder.shownAt).getTime();
  return Math.max(0, Math.floor((Date.now() - shownAt) / 1000));
}

function playBeep() {
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.value = 0.035;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.18);
}

function renderCountdown() {
  if (!currentState || !currentState.schedulerState.activeReminder) {
    countdownElement.textContent = "--";
    helperTextElement.textContent = "等待下一次提醒。";
    return;
  }

  const reminder = currentState.schedulerState.activeReminder;
  const total = currentState.config.countdownSec;
  const remaining = Math.max(0, total - elapsedSeconds(reminder));
  countdownElement.textContent = String(remaining);
  helperTextElement.textContent =
    remaining > 0
      ? "把视线移到远处，倒计时结束后仍需手动确认。"
      : "倒计时已结束，你可以选择完成、跳过或延后。";
}

function render(state) {
  currentState = state;
  const reminder = state.schedulerState.activeReminder;
  const nextReminderId = reminder ? reminder.reminderId : null;

  snoozeButton.textContent = `延后 ${Math.round(state.config.snoozeDefaultSec / 60)} 分钟`;

  if (nextReminderId && nextReminderId !== currentReminderId && state.config.soundEnabled) {
    currentReminderId = nextReminderId;
    playBeep();
  } else if (!nextReminderId) {
    currentReminderId = null;
  }

  renderCountdown();

  if (countdownTimer) {
    clearInterval(countdownTimer);
  }

  countdownTimer = setInterval(renderCountdown, 250);
}

async function act(action) {
  const reminder = currentState && currentState.schedulerState.activeReminder;
  if (!reminder) {
    return;
  }

  await window.visionApi.actOnReminder({
    reminderId: reminder.reminderId,
    action,
    elapsedSec: elapsedSeconds(reminder),
    snoozeSec: currentState.config.snoozeDefaultSec
  });
}

doneButton.addEventListener("click", () => act("DONE"));
skipButton.addEventListener("click", () => act("SKIP"));
snoozeButton.addEventListener("click", () => act("SNOOZE"));

window.addEventListener("beforeunload", () => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
  if (typeof unsubscribe === "function") {
    unsubscribe();
  }
});

window.visionApi.getBootstrap().then((state) => {
  render(state);
  unsubscribe = window.visionApi.onStateChanged((nextState) => {
    render(nextState);
  });
});
