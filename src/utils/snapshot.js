import api from "@/utils/api.js";

const BASE_URL = "/snapshot";

export function getAccountSnapshots(params) {
  return api.get(`${BASE_URL}/accounts/`, { params });
}

export function getPositionSnapshots(params) {
  return api.get(`${BASE_URL}/positions/`, { params });
}

function toPositiveInt(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

function toFiniteSeconds(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

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
