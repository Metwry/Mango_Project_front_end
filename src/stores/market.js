import { defineStore } from "pinia";
import { ref } from "vue";
import {
  addWatchlistInstrument as apiAddWatchlistInstrument,
  deleteWatchlistInstrument as apiDeleteWatchlistInstrument,
  getUserMarkets,
} from "@/utils/markets";
import { normalizeMarketCode } from "@/utils/marketMeta";
import { createMinuteAlignedScheduler } from "@/utils/refreshScheduler";
import { AUTO_REFRESH_ENABLED, STORE_REFRESH_CONFIG } from "@/config/Config";

const AUTO_REFRESH_INTERVAL_MINUTES = STORE_REFRESH_CONFIG.market.intervalMinutes;
const AUTO_REFRESH_SECOND = STORE_REFRESH_CONFIG.market.second;
const SELECTED_MARKET_KEY = STORE_REFRESH_CONFIG.market.selectedMarketStorageKey;

// 从本地存储中读取初始选中的市场。
function getInitialSelectedMarket() {
  try {
    return normalizeMarketCode(localStorage.getItem(SELECTED_MARKET_KEY)) || "ALL";
  } catch {
    return "ALL";
  }
}

// 持久化当前选中的市场到本地存储。
function persistSelectedMarket(market) {
  try {
    localStorage.setItem(SELECTED_MARKET_KEY, normalizeMarketCode(market) || "ALL");
  } catch {}
}

// 标准化市场接口返回的数据结构。
function normalizeMarkets(payload) {
  const blocks = Array.isArray(payload?.markets) ? payload.markets : [];
  return blocks
    .map((block) => {
      const market = normalizeMarketCode(block?.market);
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

// 管理行情列表、自选市场和自动刷新逻辑。
export const useMarketStore = defineStore("market", () => {
  const markets = ref([]);
  const updatedAt = ref("");
  const selectedMarket = ref(getInitialSelectedMarket());
  const loading = ref(false);
  const error = ref(null);

  const fetched = ref(false);
  const fetchPromise = ref(null);

  const autoRefreshScheduler = createMinuteAlignedScheduler({
    intervalMinutes: AUTO_REFRESH_INTERVAL_MINUTES,
    second: AUTO_REFRESH_SECOND,
    task: async () => {
      await refreshMarkets({ silent: true });
    },
    onError: () => {
      // Keep scheduler alive even when one refresh fails.
    },
  });

  // 拉取市场行情数据，并支持静默刷新与请求复用。
  async function fetchMarkets({ force = false, silent = false } = {}) {
    if (fetchPromise.value) return fetchPromise.value;
    if (fetched.value && !force) return markets.value;

    const shouldShowLoading = !silent || markets.value.length === 0;
    if (shouldShowLoading) loading.value = true;
    if (!silent) error.value = null;

    const p = (async () => {
      try {
        const res = await getUserMarkets();
        const payload = res.data ?? {};

        updatedAt.value = String(payload?.updated_at ?? "").trim();
        markets.value = normalizeMarkets(payload);

        fetched.value = true;
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

  // 强制刷新市场行情数据。
  function refreshMarkets({ silent = true } = {}) {
    return fetchMarkets({ force: true, silent });
  }

  // 添加一个新的自选标的，并刷新行情列表。
  async function addWatchlistInstrument(symbol) {
    const res = await apiAddWatchlistInstrument(symbol);
    await refreshMarkets({ silent: true });
    return res.data ?? {};
  }

  // 删除一个自选标的，并刷新行情列表。
  async function deleteWatchlistInstrument(payload) {
    await apiDeleteWatchlistInstrument(payload);
    await refreshMarkets({ silent: true });
  }

  // 更新当前选中的市场并同步到本地存储。
  function setSelectedMarket(market) {
    const next = normalizeMarketCode(market) || "ALL";
    selectedMarket.value = next;
    persistSelectedMarket(next);
  }

  // 启动行情自动刷新调度器。
  function startMarketAutoRefresh() {
    if (!AUTO_REFRESH_ENABLED) return;
    autoRefreshScheduler.start();
  }

  // 停止行情自动刷新调度器。
  function stopMarketAutoRefresh() {
    autoRefreshScheduler.stop();
  }

  // 重置行情 store 的全部状态并停止自动刷新。
  function reset() {
    stopMarketAutoRefresh();

    markets.value = [];
    updatedAt.value = "";
    loading.value = false;
    error.value = null;

    fetched.value = false;
    fetchPromise.value = null;
  }

  return {
    markets,
    updatedAt,
    selectedMarket,
    loading,
    error,

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

