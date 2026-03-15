// 计算距离下一个分钟对齐刷新时间点还需要等待的毫秒数。
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

// 创建一个按固定分钟间隔对齐执行的定时调度器。
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

  // 清理当前已注册的定时器。
  function clearTimer() {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
  }

  // 安排下一次定时执行任务，并在执行完成后继续递归调度。
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

  // 启动调度器。
  function start() {
    if (started) return;
    started = true;
    scheduleNext();
  }

  // 停止调度器并清理定时器。
  function stop() {
    started = false;
    clearTimer();
  }

  return {
    start,
    stop,
  };
}
