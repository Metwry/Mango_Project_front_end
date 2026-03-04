export const ACCOUNT_BRAND_PALETTE = Object.freeze([
  "#4F46E5",
  "#6366F1",
  "#3730A3",
  "#0EA5E9",
  "#06B6D4",
  "#14B8A6",
  "#22C55E",
  "#84CC16",
  "#F59E0B",
  "#F97316",
  "#EF4444",
  "#EC4899",
]);

function normalizeAccountKey(accountId) {
  const raw = String(accountId ?? "").trim();
  return raw || "account_default";
}

function fnv1aHash(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return hash >>> 0;
}

function hexToRgb(hex) {
  const normalized = String(hex ?? "").trim().toUpperCase();
  const match = /^#([0-9A-F]{6})$/.exec(normalized);
  if (!match) return null;
  const raw = match[1];
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

export function getAccountColorById(accountId) {
  const key = normalizeAccountKey(accountId);
  const hash = fnv1aHash(key);
  const index = hash % ACCOUNT_BRAND_PALETTE.length;
  return ACCOUNT_BRAND_PALETTE[index];
}

export function getAccountColorWithAlpha(accountId, alpha = 0.15) {
  const rgb = hexToRgb(getAccountColorById(accountId));
  if (!rgb) return `rgba(79, 70, 229, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
