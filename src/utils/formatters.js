const CURRENCY_SYMBOL_MAP = {
  CNY: "\u00a5",
  USD: "$",
  EUR: "\u20ac",
  GBP: "\u00a3",
  JPY: "JP\u00a5",
  HKD: "HK$",
  AUD: "A$",
  CAD: "C$",
};

export function toSafeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function currencySymbol(code) {
  return CURRENCY_SYMBOL_MAP[String(code || "").toUpperCase()] ?? "";
}

export function formatCurrencyAmount(
  amount,
  currency,
  {
    invalidText = "-",
    locale = "zh-CN",
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    fallbackWithCode = false,
    symbolOnly = false,
  } = {},
) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return invalidText;

  const c = String(currency || "CNY").toUpperCase();
  if (symbolOnly) {
    const symbol = currencySymbol(c);
    const absText = new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(Math.abs(n));

    if (symbol) return n < 0 ? `-${symbol}${absText}` : `${symbol}${absText}`;
    if (fallbackWithCode) return `${c} ${n.toFixed(maximumFractionDigits)}`;
    return `${n.toFixed(maximumFractionDigits)}`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: c,
      currencyDisplay: "symbol",
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(n);
  } catch {
    if (fallbackWithCode) {
      return `${c} ${n.toFixed(maximumFractionDigits)}`;
    }

    const symbol = currencySymbol(c);
    return `${symbol}${n.toFixed(maximumFractionDigits)}`;
  }
}
