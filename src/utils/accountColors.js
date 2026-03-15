// 确定账户颜色
export const ACCOUNT_BRAND_PALETTE = Object.freeze([
  "#1677FF",
  "#0EA5E9",
  "#FFB717",
  "#14B8A6",
  "#13C2C2",
  "#52C41A",
  "#10B981",
  "#84CC16",
  "#F59E0B",
  "#FA8C16",
  "#FA541C",
  "#F5222D",
  "#F43F5E",
  "#8B5CF6",
  "#722ED1",
  "#D946EF",
  "#EB2F96",
  "#64748B",
  "#6B7280",
  "#8D6E63",
]);

// 规范化账户名称，确保颜色映射时总能拿到有效键值。
function normalizeAccountKey(accountName) {
  const raw = String(accountName ?? "").trim();
  return raw || "account_default";
}

// 根据账户名称计算稳定的哈希值，用于映射固定颜色。
function fnv1aHash(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

// 将十六进制颜色转换成 RGB 对象，便于生成透明色。
function hexToRgb(hex) {
  const normalized = String(hex ?? "")
    .trim()
    .toUpperCase();
  const match = /^#([0-9A-F]{6})$/.exec(normalized);
  if (!match) return null;
  const raw = match[1];
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

// 为指定账户名称生成一个稳定且可复用的品牌色。
export function getAccountColorById(accountName) {
  const key = normalizeAccountKey(accountName);
  const hash = fnv1aHash(key);
  const index = hash % ACCOUNT_BRAND_PALETTE.length;
  return ACCOUNT_BRAND_PALETTE[index];
}

// 为指定账户名称生成带透明度的品牌色。
export function getAccountColorWithAlpha(accountName, alpha = 0.15) {
  const rgb = hexToRgb(getAccountColorById(accountName));
  if (!rgb) return `rgba(37, 99, 235, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
