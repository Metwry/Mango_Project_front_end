export function getMsToNextMinuteTick({
  intervalMinutes = 10,
  second = 0,
  now = new Date(),
  minDelayMs = 1000,
} = {}) {
  const safeInterval = Math.max(1, Math.floor(Number(intervalMinutes) || 1));
  const safeSecond = Math.min(59, Math.max(0, Math.floor(Number(second) || 0)));
  const current = now instanceof Date ? now : new Date(now);
  const next = new Date(current);

  const bucketMinute = Math.floor(next.getMinutes() / safeInterval) * safeInterval;
  next.setMinutes(bucketMinute, safeSecond, 0);

  if (next.getTime() <= current.getTime()) {
    next.setMinutes(bucketMinute + safeInterval, safeSecond, 0);
  }

  return Math.max(minDelayMs, next.getTime() - current.getTime());
}

export function createMinuteAlignedScheduler({
  intervalMinutes = 10,
  second = 0,
  minDelayMs = 1000,
  runWhenHidden = false,
  task,
  onError,
} = {}) {
  if (typeof task !== "function") {
    throw new TypeError("createMinuteAlignedScheduler requires a task function");
  }

  let timer = null;
  let started = false;

  function clearTimer() {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
  }

  function scheduleNext() {
    if (!started) return;

    timer = setTimeout(async () => {
      if (!started) return;
      const shouldSkipHiddenTask =
        !runWhenHidden &&
        typeof document !== "undefined" &&
        document.hidden;

      if (shouldSkipHiddenTask) {
        scheduleNext();
        return;
      }

      try {
        await task();
      } catch (e) {
        if (typeof onError === "function") onError(e);
      } finally {
        scheduleNext();
      }
    }, getMsToNextMinuteTick({
      intervalMinutes,
      second,
      minDelayMs,
    }));
  }

  function start() {
    if (started) return;
    started = true;
    scheduleNext();
  }

  function stop() {
    started = false;
    clearTimer();
  }

  return {
    start,
    stop,
  };
}

export function getMsToNextHourlyTick({
  minute = 0,
  second = 0,
  now = new Date(),
  minDelayMs = 1000,
} = {}) {
  const safeMinute = Math.min(59, Math.max(0, Math.floor(Number(minute) || 0)));
  const safeSecond = Math.min(59, Math.max(0, Math.floor(Number(second) || 0)));
  const current = now instanceof Date ? now : new Date(now);
  const next = new Date(current);

  next.setMinutes(safeMinute, safeSecond, 0);
  if (next.getTime() <= current.getTime()) {
    next.setHours(next.getHours() + 1);
  }

  return Math.max(minDelayMs, next.getTime() - current.getTime());
}
