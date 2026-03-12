import api, { getPayload } from "@/utils/api";
import { FX_RATES_CONFIG } from "@/config/Config";

const DEFAULT_USD_PER_CURRENCY_RATES = FX_RATES_CONFIG.defaultUsdPerCurrencyRates;
const FX_RATES_STALE_MS = FX_RATES_CONFIG.staleMs;
const USD_RATES_ENDPOINT = FX_RATES_CONFIG.usdRatesEndpoint;

let cachedUsdPerCurrencyRates = { ...DEFAULT_USD_PER_CURRENCY_RATES };
let cachedFetchedAt = 0;
let fetchPromise = null;

function getUsdExchangeRates() {
  return api.get(USD_RATES_ENDPOINT, {
    params: { base: "USD" },
  });
}

function toCode(value) {
  return String(value ?? "").trim().toUpperCase();
}

function isFinitePositive(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

export function getUsdPerCnyRate(usdPerCurrencyRates) {
  const candidate = Number(
    usdPerCurrencyRates?.CNY ?? DEFAULT_USD_PER_CURRENCY_RATES.CNY,
  );
  return isFinitePositive(candidate)
    ? candidate
    : DEFAULT_USD_PER_CURRENCY_RATES.CNY;
}

export function normalizeUsdPerCurrencyRates(payload) {
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

export function buildUsdPerCurrencyRates(payload) {
  return {
    ...DEFAULT_USD_PER_CURRENCY_RATES,
    ...normalizeUsdPerCurrencyRates(payload),
    USD: 1,
  };
}

function hasFreshRates() {
  return cachedFetchedAt > 0 && Date.now() - cachedFetchedAt < FX_RATES_STALE_MS;
}

export function getCachedUsdPerCurrencyRates() {
  return cachedUsdPerCurrencyRates;
}

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
      const payload = getPayload(res, {});
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

