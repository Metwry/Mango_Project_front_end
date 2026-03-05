import { defineStore } from "pinia";
import { ref } from "vue";
import { getPayload, getResultsList } from "@/utils/api";
import {
  buyInvestmentPosition as apiBuyInvestmentPosition,
  getInvestmentPositions,
  getLatestMarketQuotes,
  sellInvestmentPosition as apiSellInvestmentPosition,
} from "@/utils/investment";
import { createMinuteAlignedScheduler } from "@/utils/refreshScheduler";

const AUTO_REFRESH_INTERVAL_MINUTES = 10;
const AUTO_REFRESH_SECOND = 30;

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toPositiveDecimalString(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toFixed(6);
}

function normalizeLogoUrl(raw) {
  const url = String(raw?.logo_url ?? raw?.logoUrl ?? "").trim();
  return url || "";
}

function normalizeLogoColor(raw) {
  const color = String(raw?.logo_color ?? raw?.logoColor ?? "").trim().toUpperCase();

  if (/^#[0-9A-F]{6}$/.test(color)) return color;
  if (/^#[0-9A-F]{3}$/.test(color)) {
    const r = color[1];
    const g = color[2];
    const b = color[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "";
}

function normalizeQuoteRows(payload) {
  return Array.isArray(payload?.quotes) ? payload.quotes : [];
}

function normalizePosition(raw) {
  const instrumentId = toFiniteNumber(raw?.instrument_id ?? raw?.id);
  const accountId = toFiniteNumber(raw?.account_id ?? raw?.investment_account_id ?? raw?.accountId);
  const shortCode = String(raw?.short_code ?? raw?.stock_code ?? "").trim().toUpperCase();
  const stockName = String(raw?.name ?? raw?.stock_name ?? "").trim();
  const marketType = String(raw?.market_type ?? "").trim().toUpperCase();
  const costPrice = toFiniteNumber(raw?.current_cost_price);
  const quantity = toFiniteNumber(raw?.current_quantity);
  const currentValue = toFiniteNumber(raw?.current_value);
  const impliedCurrentPrice =
    Number.isFinite(currentValue) && Number.isFinite(quantity) && quantity > 0
      ? currentValue / quantity
      : null;

  return {
    instrumentId: Number.isFinite(instrumentId) ? instrumentId : null,
    accountId: Number.isFinite(accountId) ? Math.trunc(accountId) : null,
    shortCode,
    symbol: shortCode,
    name: stockName || shortCode || "未命名股票",
    logoUrl: normalizeLogoUrl(raw),
    logoColor: normalizeLogoColor(raw),
    logoText: (stockName || shortCode || "").slice(0, 2).toUpperCase(),
    marketType,
    costPrice: Number.isFinite(costPrice) ? costPrice : 0,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    currentValue: Number.isFinite(currentValue) ? currentValue : null,
    currentPrice: Number.isFinite(impliedCurrentPrice) ? impliedCurrentPrice : null,
  };
}

function buildQuoteItems(rows) {
  const dedup = new Set();
  const items = [];

  rows.forEach((row) => {
    const market = String(row?.marketType ?? "").trim().toUpperCase();
    const shortCode = String(row?.shortCode ?? row?.symbol ?? "").trim().toUpperCase();
    if (!market || !shortCode) return;

    const key = `${market}__${shortCode}`;
    if (dedup.has(key)) return;
    dedup.add(key);
    items.push({ market, short_code: shortCode });
  });

  return items;
}

function applyLatestQuotes(rows, quotes) {
  const latestMap = new Map();

  quotes.forEach((quote) => {
    const market = String(quote?.market ?? "").trim().toUpperCase();
    const shortCode = String(quote?.short_code ?? "").trim().toUpperCase();
    const latestPrice = Number(quote?.latest_price);
    const logoUrl = normalizeLogoUrl(quote);
    const logoColor = normalizeLogoColor(quote);

    if (!market || !shortCode || !Number.isFinite(latestPrice)) return;
    latestMap.set(`${market}__${shortCode}`, { latestPrice, logoUrl, logoColor });
  });

  return rows.map((row) => {
    const quantity = Number(row?.quantity);
    const key = `${String(row?.marketType ?? "").toUpperCase()}__${String(row?.shortCode ?? row?.symbol ?? "").toUpperCase()}`;
    const quote = latestMap.get(key) ?? null;
    const price = quote?.latestPrice;
    return {
      ...row,
      logoUrl: quote?.logoUrl || row?.logoUrl || "",
      logoColor: quote?.logoColor || row?.logoColor || "",
      currentPrice: Number.isFinite(price) ? price : null,
      currentValue:
        Number.isFinite(price) && Number.isFinite(quantity)
          ? price * quantity
          : row?.currentValue ?? null,
    };
  });
}

export const useInvestmentStore = defineStore("investment", () => {
  const positions = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const trading = ref(false);
  const tradeError = ref(null);

  const fetched = ref(false);
  const lastFetchedAt = ref(null);
  const lastQuotesFetchedAt = ref(null);

  const fetchPromise = ref(null);
  const quotePromise = ref(null);

  const autoRefreshScheduler = createMinuteAlignedScheduler({
    intervalMinutes: AUTO_REFRESH_INTERVAL_MINUTES,
    second: AUTO_REFRESH_SECOND,
    task: async () => {
      await refreshLatestQuotes({ silent: true });
    },
    onError: () => {
      // Keep scheduler alive even when one refresh fails.
    },
  });

  function normalizeTradePayload(raw) {
    const instrumentId = Number(raw?.instrument_id ?? raw?.instrumentId);
    const quantity = toPositiveDecimalString(raw?.quantity);
    const price = toPositiveDecimalString(raw?.price);
    const cashAccountId = Number(
      raw?.cash_account_id ??
      raw?.cashAccountId ??
      raw?.account_id ??
      raw?.accountId,
    );

    return {
      instrument_id: Number.isFinite(instrumentId) ? Math.trunc(instrumentId) : null,
      quantity,
      price,
      cash_account_id: Number.isFinite(cashAccountId) ? Math.trunc(cashAccountId) : null,
    };
  }

  async function refreshAccountsAfterTrade() {
    try {
      const { useAccountsStore } = await import("@/stores/accounts");
      await useAccountsStore().fetchAccounts({ force: true });
    } catch {
      // Ignore accounts refresh failures; trade itself already completed.
    }
  }

  function startInvestmentAutoRefresh() {
    autoRefreshScheduler.start();
  }

  function stopInvestmentAutoRefresh() {
    autoRefreshScheduler.stop();
  }

  async function refreshLatestQuotes({ silent = true } = {}) {
    const quoteItems = buildQuoteItems(positions.value);
    if (quoteItems.length === 0) return positions.value;
    if (quotePromise.value) return quotePromise.value;

    if (!silent) error.value = null;

    const p = (async () => {
      try {
        const quoteRes = await getLatestMarketQuotes({ items: quoteItems });
        const quotePayload = getPayload(quoteRes, {});
        const quoteRows = normalizeQuoteRows(quotePayload);
        positions.value = applyLatestQuotes(positions.value, quoteRows);
        lastQuotesFetchedAt.value = Date.now();
        return positions.value;
      } catch (e) {
        if (!silent) error.value = e;
        throw e;
      } finally {
        quotePromise.value = null;
      }
    })();

    quotePromise.value = p;
    return p;
  }

  async function fetchPositions({ force = false, silent = false } = {}) {
    if (fetched.value && !force) return positions.value;
    if (fetchPromise.value && !force) return fetchPromise.value;

    if (fetchPromise.value && force) {
      try {
        await fetchPromise.value;
      } catch {}
    }

    if (!silent) loading.value = true;
    if (!silent) error.value = null;

    const p = (async () => {
      try {
        const res = await getInvestmentPositions();
        const rows = getResultsList(res, []);
        positions.value = rows.map((item) => normalizePosition(item));

        fetched.value = true;
        lastFetchedAt.value = Date.now();

        await refreshLatestQuotes({ silent: true });

        return positions.value;
      } catch (e) {
        error.value = e;
        throw e;
      } finally {
        if (!silent) loading.value = false;
        fetchPromise.value = null;
      }
    })();

    fetchPromise.value = p;
    return p;
  }

  function refreshPositions() {
    return fetchPositions({ force: true });
  }

  async function submitTrade(mode, payload) {
    const apiFn = mode === "buy" ? apiBuyInvestmentPosition : apiSellInvestmentPosition;
    const normalized = normalizeTradePayload(payload);
    const isValidPayload =
      Number.isFinite(normalized.instrument_id) &&
      normalized.instrument_id > 0 &&
      !!normalized.quantity &&
      !!normalized.price &&
      Number.isFinite(normalized.cash_account_id) &&
      normalized.cash_account_id > 0;

    trading.value = true;
    tradeError.value = null;
    try {
      if (!isValidPayload) {
        throw new Error("交易参数不完整，请刷新后重试");
      }
      const res = await apiFn(normalized);
      await Promise.all([
        refreshPositions(),
        refreshAccountsAfterTrade(),
      ]);
      return getPayload(res, {});
    } catch (e) {
      tradeError.value = e;
      throw e;
    } finally {
      trading.value = false;
    }
  }

  function buyPosition(payload) {
    return submitTrade("buy", payload);
  }

  function sellPosition(payload) {
    return submitTrade("sell", payload);
  }

  function reset() {
    stopInvestmentAutoRefresh();

    positions.value = [];
    loading.value = false;
    error.value = null;
    trading.value = false;
    tradeError.value = null;

    fetched.value = false;
    lastFetchedAt.value = null;
    lastQuotesFetchedAt.value = null;

    fetchPromise.value = null;
    quotePromise.value = null;
  }

  return {
    positions,
    loading,
    error,
    trading,
    tradeError,
    fetched,
    lastFetchedAt,
    lastQuotesFetchedAt,

    fetchPositions,
    refreshPositions,
    refreshLatestQuotes,
    buyPosition,
    sellPosition,
    startInvestmentAutoRefresh,
    stopInvestmentAutoRefresh,
    reset,
  };
});
