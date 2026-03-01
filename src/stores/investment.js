import { defineStore } from "pinia";
import { ref } from "vue";
import { getPayload, getResultsList } from "@/utils/apiPayload";
import { getInvestmentPositions, getLatestMarketQuotes } from "@/utils/investment";
import { getMsToNextMinuteTick } from "@/utils/refreshScheduler";

const AUTO_REFRESH_INTERVAL_MINUTES = 10;
const AUTO_REFRESH_SECOND = 20;

function normalizePosition(raw) {
  const shortCode = String(raw?.short_code ?? raw?.stock_code ?? "").trim().toUpperCase();
  const stockName = String(raw?.name ?? raw?.stock_name ?? "").trim();
  const marketType = String(raw?.market_type ?? "").trim().toUpperCase();
  const costPrice = Number(raw?.current_cost_price);
  const quantity = Number(raw?.current_quantity);

  return {
    symbol: shortCode,
    name: stockName || shortCode || "未命名股票",
    marketType,
    costPrice: Number.isFinite(costPrice) ? costPrice : 0,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    currentPrice: null,
    trend: [],
  };
}

function buildQuoteItems(rows) {
  const dedup = new Set();
  const items = [];

  rows.forEach((row) => {
    const market = String(row?.marketType ?? "").trim().toUpperCase();
    const shortCode = String(row?.symbol ?? "").trim().toUpperCase();
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
    const market = String(quote?.market ?? quote?.market_type ?? "").trim().toUpperCase();
    const shortCode = String(quote?.short_code ?? quote?.symbol ?? "").trim().toUpperCase();
    const latestPrice = Number(quote?.latest_price);

    if (!market || !shortCode || !Number.isFinite(latestPrice)) return;
    latestMap.set(`${market}__${shortCode}`, latestPrice);
  });

  return rows.map((row) => {
    const key = `${String(row?.marketType ?? "").toUpperCase()}__${String(row?.symbol ?? "").toUpperCase()}`;
    const price = latestMap.get(key);
    return {
      ...row,
      currentPrice: Number.isFinite(price) ? price : null,
    };
  });
}

export const useInvestmentStore = defineStore("investment", () => {
  const positions = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const fetched = ref(false);
  const lastFetchedAt = ref(null);
  const lastQuotesFetchedAt = ref(null);

  const fetchPromise = ref(null);
  const quotePromise = ref(null);

  let autoRefreshTimer = null;

  function clearAutoRefreshTimer() {
    if (!autoRefreshTimer) return;
    clearTimeout(autoRefreshTimer);
    autoRefreshTimer = null;
  }

  function scheduleNextAutoRefresh() {
    clearAutoRefreshTimer();
    autoRefreshTimer = setTimeout(async () => {
      try {
        await refreshLatestQuotes({ silent: true });
      } catch {
        // Keep scheduler alive even when one refresh fails.
      }

      scheduleNextAutoRefresh();
    }, getMsToNextMinuteTick({
      intervalMinutes: AUTO_REFRESH_INTERVAL_MINUTES,
      second: AUTO_REFRESH_SECOND,
    }));
  }

  function startInvestmentAutoRefresh() {
    scheduleNextAutoRefresh();
  }

  function stopInvestmentAutoRefresh() {
    clearAutoRefreshTimer();
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
        const quoteRows = Array.isArray(quotePayload?.quotes) ? quotePayload.quotes : [];
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

  function reset() {
    stopInvestmentAutoRefresh();

    positions.value = [];
    loading.value = false;
    error.value = null;

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
    fetched,
    lastFetchedAt,
    lastQuotesFetchedAt,

    fetchPositions,
    refreshPositions,
    refreshLatestQuotes,
    startInvestmentAutoRefresh,
    stopInvestmentAutoRefresh,
    reset,
  };
});
