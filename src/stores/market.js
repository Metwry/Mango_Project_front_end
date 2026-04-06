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
import { useAsyncState } from "@/composables/useAsyncState";

const AUTO_REFRESH_INTERVAL_MINUTES = STORE_REFRESH_CONFIG.market.intervalMinutes;
const AUTO_REFRESH_SECOND = STORE_REFRESH_CONFIG.market.second;
const SELECTED_MARKET_KEY = STORE_REFRESH_CONFIG.market.selectedMarketStorageKey;

// 从本地存储中读取初始选中的市场。
function getInitialSelectedMarket() {
  return normalizeMarketCode(localStorage.getItem(SELECTED_MARKET_KEY)) || "ALL";
}

// 持久化当前选中的市场到本地存储。
function persistSelectedMarket(market) {
  try {
    localStorage.setItem(SELECTED_MARKET_KEY, normalizeMarketCode(market) || "ALL");
  } catch {}
}

// 标准化市场接口返回的数据结构。
function normalizeMarkets(payload) {
  return payload.markets.map((block) => ({
    market: normalizeMarketCode(block.market),
    quotes: block.quotes.map((item) => ({
      ...item,
      short_code: String(item.short_code).trim().toUpperCase(),
    })),
  }));
}

// 管理行情列表、自选市场和自动刷新逻辑。
export const useMarketStore = defineStore("market", () => {
  const markets = ref([]);
  const updatedAt = ref("");
  const selectedMarket = ref(getInitialSelectedMarket());

  const { loading, error, fetched, run, reset: resetAsync } = useAsyncState();

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
    const shouldShowLoading = !silent || markets.value.length === 0;
    return run(
      { force, silent: !shouldShowLoading, getCached: () => markets.value },
      async () => {
        const res = await getUserMarkets();
        updatedAt.value = String(res.data.updated_at ?? "").trim();
        markets.value = normalizeMarkets(res.data);
        return markets.value;
      },
    );
  }

  // 强制刷新市场行情数据。
  function refreshMarkets({ silent = true } = {}) {
    return fetchMarkets({ force: true, silent });
  }

  // 添加一个新的自选标的，并刷新行情列表。
  async function addWatchlistInstrument(symbol) {
    const res = await apiAddWatchlistInstrument(symbol);
    await refreshMarkets({ silent: true });
    return res.data;
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
    resetAsync();
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
