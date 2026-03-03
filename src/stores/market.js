import { defineStore } from "pinia";
import { ref } from "vue";
import {
  addWatchlistInstrument as apiAddWatchlistInstrument,
  deleteWatchlistInstrument as apiDeleteWatchlistInstrument,
  getUserMarkets,
} from "@/utils/markets";
import { getPayload } from "@/utils/apiPayload";
import { getMsToNextMinuteTick } from "@/utils/refreshScheduler";

const AUTO_REFRESH_INTERVAL_MINUTES = 10;
const AUTO_REFRESH_SECOND = 10;
const SELECTED_MARKET_KEY = "market_selected_market";

function normalizeDataMarketCode(value) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeMarketCode(value) {
  const normalized = normalizeDataMarketCode(value);
  return normalized || "ALL";
}

function getInitialSelectedMarket() {
  try {
    return normalizeMarketCode(localStorage.getItem(SELECTED_MARKET_KEY));
  } catch {
    return "ALL";
  }
}

function persistSelectedMarket(market) {
  try {
    localStorage.setItem(SELECTED_MARKET_KEY, normalizeMarketCode(market));
  } catch {}
}

function normalizeMarkets(payload) {
  const blocks = Array.isArray(payload?.markets) ? payload.markets : [];
  return blocks
    .map((block) => {
      const market = normalizeDataMarketCode(block?.market);
      if (!market) return null;

      const quotes = Array.isArray(block?.quotes) ? block.quotes : [];
      return {
        market,
        stale: Boolean(block?.stale),
        quotes: quotes
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            ...item,
            short_code: String(item?.short_code ?? "").trim().toUpperCase(),
          })),
      };
    })
    .filter(Boolean);
}

function pickUpdatedAt(payload) {
  return String(payload?.updated_at ?? "").trim();
}

export const useMarketStore = defineStore("market", () => {
  const markets = ref([]);
  const updatedAt = ref("");
  const selectedMarket = ref(getInitialSelectedMarket());
  const loading = ref(false);
  const error = ref(null);

  const fetched = ref(false);
  const lastFetchedAt = ref(null);
  const fetchPromise = ref(null);

  let autoRefreshTimer = null;

  async function fetchMarkets({ force = false, silent = false } = {}) {
    if (fetched.value && !force) return markets.value;
    if (fetchPromise.value && !force) return fetchPromise.value;

    if (fetchPromise.value && force) {
      try {
        await fetchPromise.value;
      } catch {}
    }

    const shouldShowLoading = !silent || markets.value.length === 0;
    if (shouldShowLoading) loading.value = true;
    if (!silent) error.value = null;

    const p = (async () => {
      try {
        const res = await getUserMarkets();
        const payload = getPayload(res, {});

        updatedAt.value = pickUpdatedAt(payload);
        markets.value = normalizeMarkets(payload);

        fetched.value = true;
        lastFetchedAt.value = Date.now();
        return markets.value;
      } catch (e) {
        if (!silent || markets.value.length === 0) {
          error.value = e;
          markets.value = [];
        }
        throw e;
      } finally {
        if (shouldShowLoading) loading.value = false;
        fetchPromise.value = null;
      }
    })();

    fetchPromise.value = p;
    return p;
  }

  function refreshMarkets({ silent = true } = {}) {
    return fetchMarkets({ force: true, silent });
  }

  async function addWatchlistInstrument(symbol) {
    const res = await apiAddWatchlistInstrument(symbol);
    await refreshMarkets({ silent: true });
    return getPayload(res, {});
  }

  async function deleteWatchlistInstrument(payload) {
    await apiDeleteWatchlistInstrument(payload);
    await refreshMarkets({ silent: true });
  }

  function setSelectedMarket(market) {
    const next = normalizeMarketCode(market);
    selectedMarket.value = next;
    persistSelectedMarket(next);
  }

  function clearAutoRefreshTimer() {
    if (!autoRefreshTimer) return;
    clearTimeout(autoRefreshTimer);
    autoRefreshTimer = null;
  }

  function scheduleNextAutoRefresh() {
    clearAutoRefreshTimer();
    autoRefreshTimer = setTimeout(async () => {
      try {
        await refreshMarkets({ silent: true });
      } catch {
        // Keep scheduler alive even when one refresh fails.
      }

      scheduleNextAutoRefresh();
    }, getMsToNextMinuteTick({
      intervalMinutes: AUTO_REFRESH_INTERVAL_MINUTES,
      second: AUTO_REFRESH_SECOND,
    }));
  }

  function startMarketAutoRefresh() {
    scheduleNextAutoRefresh();
  }

  function stopMarketAutoRefresh() {
    clearAutoRefreshTimer();
  }

  function reset() {
    stopMarketAutoRefresh();

    markets.value = [];
    updatedAt.value = "";
    loading.value = false;
    error.value = null;

    fetched.value = false;
    lastFetchedAt.value = null;
    fetchPromise.value = null;
  }

  return {
    markets,
    updatedAt,
    selectedMarket,
    loading,
    error,
    fetched,
    lastFetchedAt,

    fetchMarkets,
    refreshMarkets,
    addWatchlistInstrument,
    deleteWatchlistInstrument,
    setSelectedMarket,
    startMarketAutoRefresh,
    stopMarketAutoRefresh,
    reset,
  };
});
