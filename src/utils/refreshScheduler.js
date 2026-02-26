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
