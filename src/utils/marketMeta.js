const MARKET_META = Object.freeze({
  CN: { label: "A股", pricePrefix: "¥" },
  CRYPTO: { label: "加密货币", pricePrefix: "$" },
  FX: { label: "外汇", pricePrefix: "" },
  HK: { label: "港股", pricePrefix: "HK$" },
  US: { label: "美股", pricePrefix: "$" },
});

// 规范化市场代码，统一转换为大写文本。
export function normalizeMarketCode(value) {
  return String(value ?? "").trim().toUpperCase();
}

// 根据市场代码返回展示用的中文名称。
export function getMarketLabel(value, fallback = "未知市场") {
  const market = normalizeMarketCode(value);
  return MARKET_META[market]?.label || market || fallback;
}

// 根据市场代码返回价格前缀。
export function getMarketPricePrefix(value) {
  return MARKET_META[normalizeMarketCode(value)]?.pricePrefix ?? "";
}
