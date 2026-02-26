const DEFAULT_USD_PER_CURRENCY_RATES = Object.freeze({
  USD: 1,
  CNY: 0.14,
  EUR: 1.08,
  JPY: 0.0067,
  GBP: 1.27,
  HKD: 0.128,
});

function toCode(value) {
  return String(value ?? "").trim().toUpperCase();
}

function isFinitePositive(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

function pickRatesSource(payload) {
  return (
    payload?.rates ??
    payload?.usd_rates ??
    payload?.exchange_rates ??
    payload?.data?.rates ??
    payload?.data?.usd_rates ??
    payload?.data?.exchange_rates ??
    payload?.results ??
    payload?.data?.results ??
    payload
  );
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

function getSafeUsdPerCnyRate(usdPerCurrencyRates) {
  const candidate = Number(
    usdPerCurrencyRates?.CNY ?? DEFAULT_USD_PER_CURRENCY_RATES.CNY,
  );
  return isFinitePositive(candidate)
    ? candidate
    : DEFAULT_USD_PER_CURRENCY_RATES.CNY;
}

export function normalizeUsdPerCurrencyRates(payload) {
  const source = pickRatesSource(payload);
  const normalized = { USD: 1 };

  if (Array.isArray(source)) {
    source.forEach((item) => {
      const code = toCode(item?.currency ?? item?.code ?? item?.symbol);
      const usdPerCurrency = readRateValue(item);
      if (!code || !usdPerCurrency) return;

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
    const usdPerCurrency = readRateValue(rawValue);
    if (!code || !usdPerCurrency) return;

    if (isFinitePositive(usdPerCurrency)) {
      normalized[code] = usdPerCurrency;
    }
  });

  return normalized;
}

export function getUsdPerCurrencyRate(account, usdPerCurrencyRates) {
  const customRate = Number(account?.usd_rate ?? account?.usdRate);
  if (isFinitePositive(customRate)) return customRate;

  const currency = toCode(account?.currency || "USD");
  return (
    usdPerCurrencyRates?.[currency] ??
    DEFAULT_USD_PER_CURRENCY_RATES[currency] ??
    1
  );
}

export function calculateAccountValue(account, usdPerCurrencyRates) {
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
  const usdPerCny = getSafeUsdPerCnyRate(usdPerCurrencyRates);

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

  const usdRate = getUsdPerCurrencyRate(account, usdPerCurrencyRates);
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

export function calculateAccountsTotalInCny(accounts, usdPerCurrencyRates) {
  return buildAccountsValuation(accounts, usdPerCurrencyRates).totalValueCny;
}

export { DEFAULT_USD_PER_CURRENCY_RATES };
