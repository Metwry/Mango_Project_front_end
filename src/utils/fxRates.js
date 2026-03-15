import api from "@/utils/api";
import { FX_RATES_CONFIG } from "@/config/Config";

const DEFAULT_USD_PER_CURRENCY_RATES = FX_RATES_CONFIG.defaultUsdPerCurrencyRates;
const FX_RATES_STALE_MS = FX_RATES_CONFIG.staleMs;
const USD_RATES_ENDPOINT = FX_RATES_CONFIG.usdRatesEndpoint;

let cachedUsdPerCurrencyRates = { ...DEFAULT_USD_PER_CURRENCY_RATES };
let cachedFetchedAt = 0;
let fetchPromise = null;

// 请求以美元为基准的汇率数据。
function getUsdExchangeRates() {
  return api.get(USD_RATES_ENDPOINT, {
    params: { base: "USD" },
  });
}

// 规范化币种代码，统一转成大写文本。
function toCode(value) {
  return String(value ?? "").trim().toUpperCase();
}

// 判断一个值是否为大于零的有限数。
function isFinitePositive(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

// 获取美元兑人民币的汇率，必要时回退到默认配置。
function getUsdPerCnyRate(usdPerCurrencyRates) {
  const candidate = Number(
    usdPerCurrencyRates?.CNY ?? DEFAULT_USD_PER_CURRENCY_RATES.CNY,
  );
  return isFinitePositive(candidate)
    ? candidate
    : DEFAULT_USD_PER_CURRENCY_RATES.CNY;
}

// 把接口返回的汇率数据标准化为每单位外币对应多少美元。
function normalizeUsdPerCurrencyRates(payload) {
  const normalized = { USD: 1 };
  const rates = payload?.rates;
  if (!rates || typeof rates !== "object") {
    return normalized;
  }

  Object.entries(rates).forEach(([rawCode, rawValue]) => {
    const code = toCode(rawCode);
    const rawRate = Number(rawValue);
    if (!code || !rawRate) return;

    const usdPerCurrency = code === "USD" ? 1 : 1 / rawRate;

    if (isFinitePositive(usdPerCurrency)) {
      normalized[code] = usdPerCurrency;
    }
  });

  return normalized;
}

// 解析目标币种对应的美元汇率，并在缺失时回退到默认值。
export function resolveUsdPerCurrencyRate(target, usdPerCurrencyRates) {
  const currency = toCode(
    typeof target === "string" ? target : (target?.currency || "USD"),
  );
  return (
    usdPerCurrencyRates?.[currency] ??
    DEFAULT_USD_PER_CURRENCY_RATES[currency] ??
    1
  );
}

// 合并默认汇率与接口汇率，生成完整的美元汇率映射。
function buildUsdPerCurrencyRates(payload) {
  return {
    ...DEFAULT_USD_PER_CURRENCY_RATES,
    ...normalizeUsdPerCurrencyRates(payload),
    USD: 1,
  };
}

// 判断当前缓存汇率是否仍在有效期内。
function hasFreshRates() {
  return cachedFetchedAt > 0 && Date.now() - cachedFetchedAt < FX_RATES_STALE_MS;
}

// 读取当前内存中的汇率缓存。
export function getCachedUsdPerCurrencyRates() {
  return cachedUsdPerCurrencyRates;
}

// 确保拿到一份可用汇率，必要时发起请求并维护缓存。
export async function ensureUsdPerCurrencyRates({ force = false } = {}) {
  if (!force && hasFreshRates()) {
    return cachedUsdPerCurrencyRates;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const res = await getUsdExchangeRates();
      const payload = res.data ?? {};
      cachedUsdPerCurrencyRates = buildUsdPerCurrencyRates(payload);
      cachedFetchedAt = Date.now();
      return cachedUsdPerCurrencyRates;
    } catch (e) {
      if (cachedFetchedAt > 0) {
        return cachedUsdPerCurrencyRates;
      }
      throw e;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

// 计算单个账户按汇率换算后的美元和人民币价值。
function calculateAccountValue(account, usdPerCurrencyRates) {
  const balance = Number(account?.balance ?? 0);
  if (!Number.isFinite(balance)) {
    return {
      balance: 0,
      currency: toCode(account?.currency || "USD"),
      usdRate: 1,
      valueUsd: 0,
      valueCny: 0,
      absValueCny: 0,
      positiveValueCny: 0,
    };
  }

  const currency = toCode(account?.currency || "USD");
  const usdPerCny = getUsdPerCnyRate(usdPerCurrencyRates);

  if (currency === "CNY") {
    const valueCny = balance;
    const valueUsd = balance * usdPerCny;
    return {
      balance,
      currency,
      usdRate: usdPerCny,
      valueUsd,
      valueCny,
      absValueCny: Math.abs(valueCny),
      positiveValueCny: Math.max(0, valueCny),
    };
  }

  const usdRate = resolveUsdPerCurrencyRate(account, usdPerCurrencyRates);
  const valueUsd = balance * usdRate;
  const valueCny = valueUsd / usdPerCny;

  return {
    balance,
    currency,
    usdRate,
    valueUsd,
    valueCny,
    absValueCny: Math.abs(valueCny),
    positiveValueCny: Math.max(0, valueCny),
  };
}

// 为账户列表补充估值字段，并汇总总资产价值。
export function buildAccountsValuation(accounts, usdPerCurrencyRates) {
  const valuedAccounts = (accounts || []).map((account) => ({
    ...account,
    ...calculateAccountValue(account, usdPerCurrencyRates),
  }));

  const totalValueUsd = valuedAccounts.reduce(
    (sum, account) => sum + Number(account.valueUsd || 0),
    0,
  );
  const totalValueCny = valuedAccounts.reduce(
    (sum, account) => sum + Number(account.valueCny || 0),
    0,
  );

  return {
    valuedAccounts,
    totalValueUsd,
    totalValueCny,
  };
}

export { DEFAULT_USD_PER_CURRENCY_RATES };

