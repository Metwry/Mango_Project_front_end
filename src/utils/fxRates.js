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

// 统一币种代码写法，和后端保持大写格式。
function normalizeCurrency(value) {
  return String(value ?? "").trim().toUpperCase();
}

// 把后端返回的 USD 基准 rates 转成每单位外币对应多少美元。
function toUsdPerCurrencyRates(rates) {
  const mapped = { USD: 1 };

  Object.entries(rates).forEach(([code, rate]) => {
    const currency = normalizeCurrency(code);
    mapped[currency] = currency === "USD" ? 1 : 1 / Number(rate);
  });

  return mapped;
}

// 解析目标币种对应的美元汇率。
export function resolveUsdPerCurrencyRate(target, usdPerCurrencyRates) {
  const currency = normalizeCurrency(
    typeof target === "string" ? target : (target?.currency || "USD"),
  );
  return (
    usdPerCurrencyRates?.[currency] ??
    DEFAULT_USD_PER_CURRENCY_RATES[currency] ??
    1
  );
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

  fetchPromise = getUsdExchangeRates()
    .then((res) => {
      cachedUsdPerCurrencyRates = {
        ...DEFAULT_USD_PER_CURRENCY_RATES,
        ...toUsdPerCurrencyRates(res.data.rates),
        USD: 1,
      };
      cachedFetchedAt = Date.now();
      return cachedUsdPerCurrencyRates;
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

// 计算单个账户按汇率换算后的美元和人民币价值。
function calculateAccountValue(account, usdPerCurrencyRates) {
  const balance = Number(account.balance);
  const currency = normalizeCurrency(account.currency || "USD");
  const usdPerCny = resolveUsdPerCurrencyRate("CNY", usdPerCurrencyRates);

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

  const usdRate = resolveUsdPerCurrencyRate(currency, usdPerCurrencyRates);
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
