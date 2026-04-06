import api from "@/utils/api.js";

const BASE_URL = "/snapshot";

// 获取账户资产快照列表。
export function getAccountSnapshots(params) {
  return api.get(`${BASE_URL}/accounts/`, { params });
}

// 获取持仓快照列表。
export function getPositionSnapshots(params) {
  return api.get(`${BASE_URL}/positions/`, { params });
}

// 根据快照元信息构建完整的时间轴数组。
export function buildSnapshotTimeline(meta) {
  const pointCount = Number(meta.point_count);
  const axisStartMs = new Date(meta.axis_start_time).getTime();
  const intervalSeconds = Number(meta.interval_seconds);

  if (intervalSeconds > 0) {
    const stepMs = intervalSeconds * 1000;
    return Array.from({ length: pointCount }, (_, index) => (
      new Date(axisStartMs + index * stepMs).toISOString()
    ));
  }

  const startDate = new Date(axisStartMs);
  return Array.from({ length: pointCount }, (_, index) => {
    const utcDate = new Date(Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth() + index,
      1,
      0,
      0,
      0,
      0,
    ));
    return utcDate.toISOString();
  });
}
