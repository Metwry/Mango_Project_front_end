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

// 将输入值转换成正整数，非法值返回 0。
function toPositiveInt(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

// 将输入值转换成正的秒数，非法值返回 0。
function toFiniteSeconds(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// 根据快照元信息构建完整的时间轴数组。
export function buildSnapshotTimeline(meta) {
  const pointCount = toPositiveInt(meta?.point_count);
  const axisStartText = String(meta?.axis_start_time ?? "").trim();
  if (!pointCount || !axisStartText) return [];

  const axisStartMs = new Date(axisStartText).getTime();
  if (!Number.isFinite(axisStartMs)) return [];

  const intervalSeconds = toFiniteSeconds(meta?.interval_seconds);
  if (intervalSeconds > 0) {
    const stepMs = intervalSeconds * 1000;
    return Array.from({ length: pointCount }, (_, index) => (
      new Date(axisStartMs + index * stepMs).toISOString()
    ));
  }

  const level = String(meta?.level ?? "").trim().toUpperCase();
  if (level !== "MON1") return [];

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
