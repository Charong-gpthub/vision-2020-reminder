const { createSessionId } = require("../domain/reminder-state");

function createAppController({
  scheduler = null,
  schedulerFactory = null,
  configStore,
  logStore,
  statsProvider,
  windowManager,
  shellAdapter,
  appAdapter = null,
  nowProvider = () => new Date(),
  sessionIdFactory = createSessionId,
  automation = { enabled: false }
}) {
  let activeConfig = null;
  let activeSession = null;
  let activeScheduler = scheduler;
  let isQuitting = false;

  function ensureInitialized() {
    if (!activeConfig) {
      throw new Error("App controller has not been initialized.");
    }
  }

  function getScheduler() {
    if (!activeScheduler) {
      throw new Error("Scheduler has not been created.");
    }
    return activeScheduler;
  }

  function buildState(now = nowProvider()) {
    ensureInitialized();
    return {
      config: activeConfig,
      session: activeSession,
      schedulerState: getScheduler().getState(now),
      todayStats: statsProvider.getTodayStats({ now })
    };
  }

  function broadcastState(now = nowProvider()) {
    windowManager.broadcastState(buildState(now));
  }

  function initialize() {
    activeConfig = configStore.ensure();
    const launchAt = nowProvider();
    if (!activeScheduler) {
      if (!schedulerFactory) {
        throw new Error("A scheduler or schedulerFactory is required.");
      }
      activeScheduler = schedulerFactory(activeConfig, launchAt);
    } else if (activeScheduler.updateConfig) {
      activeScheduler.updateConfig(activeConfig, launchAt);
    }

    activeSession = {
      sessionId: sessionIdFactory(),
      launchAt: launchAt.toISOString()
    };

    logStore.append({
      ts: activeSession.launchAt,
      type: "SESSION_STARTED",
      sessionId: activeSession.sessionId,
      env: activeConfig.env,
      profile: activeConfig.profile,
      config: activeConfig
    });

    broadcastState(launchAt);
    return buildState(launchAt);
  }

  function maybeRunAutomation(reminder) {
    if (!automation.enabled) {
      return;
    }

    setTimeout(() => {
      const state = getScheduler().getState(nowProvider());
      if (!state.activeReminder || state.activeReminder.reminderId !== reminder.reminderId) {
        return;
      }

      handleReminderAction({
        reminderId: reminder.reminderId,
        action: automation.action || "DONE",
        elapsedSec: 1,
        snoozeSec: activeConfig.snoozeDefaultSec
      });
    }, automation.delayMs || 800);
  }

  function handleTick(now = nowProvider()) {
    ensureInitialized();
    const event = getScheduler().tick(now);

    if (event && event.type === "SHOW_REMINDER") {
      logStore.append({
        ts: event.reminder.shownAt,
        type: "REMINDER_SHOWN",
        reminderId: event.reminder.reminderId,
        parentReminderId: event.reminder.parentReminderId,
        scheduledAt: event.reminder.scheduledAt,
        shownAt: event.reminder.shownAt,
        reason: event.reminder.reason,
        env: activeConfig.env,
        profile: activeConfig.profile,
        intervalSec: activeConfig.intervalSec,
        sessionId: activeSession.sessionId
      });
      windowManager.showReminder(event.reminder, activeConfig, buildState(now));
      maybeRunAutomation(event.reminder);
    }

    broadcastState(now);
    return event;
  }

  function handleReminderAction({
    reminderId,
    action,
    elapsedSec,
    snoozeSec = activeConfig.snoozeDefaultSec,
    source = null
  }) {
    ensureInitialized();
    const now = nowProvider();
    getScheduler().applyAction({
      reminderId,
      action,
      elapsedSec,
      snoozeSec,
      now
    });

    const event = {
      ts: now.toISOString(),
      type: "ACTION",
      reminderId,
      action,
      countdownSec: activeConfig.countdownSec,
      elapsedSec
    };

    if (action === "SNOOZE") {
      event.snoozeSec = snoozeSec;
    }

    if (source) {
      event.source = source;
    }

    logStore.append(event);
    windowManager.closeReminder();
    broadcastState(now);
    return event;
  }

  function handleReminderWindowClosed() {
    const activeReminder = getScheduler().getState(nowProvider()).activeReminder;
    if (!activeReminder) {
      return null;
    }

    return handleReminderAction({
      reminderId: activeReminder.reminderId,
      action: "SKIP",
      elapsedSec: 0,
      source: "window_close"
    });
  }

  function handleDashboardCloseRequest() {
    if (isQuitting) {
      return { allowClose: true };
    }

    windowManager.minimizeDashboard();
    return { allowClose: false };
  }

  function handleSettingsUpdate(partialConfig) {
    ensureInitialized();
    activeConfig = configStore.updateConfig(partialConfig);
    if (getScheduler().updateConfig) {
      getScheduler().updateConfig(activeConfig, nowProvider());
    }
    broadcastState(nowProvider());
    return activeConfig;
  }

  function requestQuit() {
    isQuitting = true;
    if (windowManager.prepareForQuit) {
      windowManager.prepareForQuit();
    }
    if (appAdapter && appAdapter.quit) {
      appAdapter.quit();
    }
    return { quitting: true };
  }

  function prepareForQuit() {
    isQuitting = true;
    return { quitting: true };
  }

  function openDataDir() {
    ensureInitialized();
    return shellAdapter.openPath(configStore.getDataDir());
  }

  return {
    getBootstrap() {
      return buildState(nowProvider());
    },
    getConfig() {
      ensureInitialized();
      return activeConfig;
    },
    handleDashboardCloseRequest,
    handleReminderAction,
    handleReminderWindowClosed,
    handleSettingsUpdate,
    handleTick,
    initialize,
    openDataDir,
    prepareForQuit,
    requestQuit
  };
}

module.exports = {
  createAppController
};
