import api, { getPayload } from "@/utils/api";
import { FX_RATES_CONFIG } from "@/config/featureConfig";

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

function pickRatesSource(payload) {
  const resolveRatesQuoteMode = (rates, base) => {
    const baseCode = toCode(base);
    if (baseCode === "USD") return "currency_per_usd";
    if (baseCode) return "usd_per_currency";

    const usd = Number(rates?.USD);
    const cny = Number(rates?.CNY);
    if (usd === 1 && Number.isFinite(cny) && cny > 1) {
      return "currency_per_usd";
    }
    return "usd_per_currency";
  };

  if (payload?.usd_rates) {
    return { source: payload.usd_rates, quoteMode: "usd_per_currency" };
  }
  if (payload?.exchange_rates) {
    return { source: payload.exchange_rates, quoteMode: "usd_per_currency" };
  }
  if (payload?.rates) {
    return {
      source: payload.rates,
      quoteMode: resolveRatesQuoteMode(payload.rates, payload?.base),
    };
  }

  if (payload?.data?.usd_rates) {
    return { source: payload.data.usd_rates, quoteMode: "usd_per_currency" };
  }
  if (payload?.data?.exchange_rates) {
    return { source: payload.data.exchange_rates, quoteMode: "usd_per_currency" };
  }
  if (payload?.data?.rates) {
    return {
      source: payload.data.rates,
      quoteMode: resolveRatesQuoteMode(payload.data.rates, payload?.data?.base),
    };
  }

  if (payload?.results) {
    return { source: payload.results, quoteMode: "usd_per_currency" };
  }
  if (payload?.data?.results) {
    return { source: payload.data.results, quoteMode: "usd_per_currency" };
  }

  return { source: payload, quoteMode: "usd_per_currency" };
}

function readRateValue(raw) {
  if (raw && typeof raw === "object") {
    if (isFinitePositive(raw?.usd_rate)) {
      return Number(raw.usd_rate);
    }
    if (isFinitePositive(raw?.usdRate)) {
      return Number(raw.usdRate);
    }

    const candidate = Number(raw?.rate ?? raw?.value);
    if (Number.isFinite(candidate) && candidate > 0) {
      return candidate;
    }
    return null;
  }

  const direct = Number(raw);
  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }
  return null;
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
  const { source, quoteMode } = pickRatesSource(payload);
  const normalized = { USD: 1 };

  if (Array.isArray(source)) {
    source.forEach((item) => {
      const code = toCode(item?.currency ?? item?.code ?? item?.symbol);
      const rawRate = readRateValue(item);
      if (!code || !rawRate) return;

      const usdPerCurrency =
        quoteMode === "currency_per_usd" && code !== "USD"
          ? 1 / rawRate
          : rawRate;

      if (isFinitePositive(usdPerCurrency)) {
        normalized[code] = usdPerCurrency;
      }
    });
    return normalized;
  }

  if (!source || typeof source !== "object") {
    return normalized;
  }

  Object.entries(source).forEach(([rawCode, rawValue]) => {
    const code = toCode(rawCode);
    const rawRate = readRateValue(rawValue);
    if (!code || !rawRate) return;

    const usdPerCurrency =
      quoteMode === "currency_per_usd" && code !== "USD"
        ? 1 / rawRate
        : rawRate;

    if (isFinitePositive(usdPerCurrency)) {
      normalized[code] = usdPerCurrency;
    }
  });

  return normalized;
}

export function resolveUsdPerCurrencyRate(target, usdPerCurrencyRates) {
  const customRate = Number(target?.usd_rate ?? target?.usdRate);
  if (isFinitePositive(customRate)) return customRate;

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
