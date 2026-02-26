import { computed, onMounted, onUnmounted, ref } from "vue";
import { ElMessage } from "element-plus";
import {
  addWatchlistInstrument,
  deleteWatchlistInstrument,
  getUserMarkets,
  searchMarketInstruments,
} from "@/utils/markets";
import { getPayload } from "@/utils/apiPayload";
import { getMsToNextMinuteTick } from "@/utils/refreshScheduler";

const MARKET_META = {
  CN: { label: "A股", pricePrefix: "¥" },
  CRYPTO: { label: "加密货币", pricePrefix: "$" },
  FX: { label: "外汇", pricePrefix: "" },
  HK: { label: "港股", pricePrefix: "HK$" },
  US: { label: "美股", pricePrefix: "$" },
};

const AUTO_REFRESH_MINUTES = 10;
const AUTO_REFRESH_SECOND = 5;
const SEARCH_DEBOUNCE_MS = 250;

function normalizeMarketCode(value) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeSearchQuery(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function useMarketPage() {
  const loading = ref(false);
  const error = ref(null);
  const markets = ref([]);
  const updatedAt = ref("");

  const selectedMarket = ref("ALL");
  const keywordInput = ref("");
  const searchLoading = ref(false);
  const searchResults = ref([]);
  const showSearchDropdown = ref(false);
  const isComposing = ref(false);

  let autoRefreshTimer = null;
  let searchDebounceTimer = null;
  let searchRequestSeq = 0;
  let lastSearchedQuery = "";
  const searchResultCache = new Map();

  function getMarketLabel(marketCode) {
    const code = normalizeMarketCode(marketCode);
    return MARKET_META[code]?.label || code || "未知市场";
  }

  function getPricePrefix(marketCode) {
    const code = normalizeMarketCode(marketCode);
    return MARKET_META[code]?.pricePrefix ?? "";
  }

  const marketButtons = computed(() => {
    const counter = new Map();
    for (const block of markets.value) {
      const market = normalizeMarketCode(block?.market);
      if (!market) continue;
      const quotes = Array.isArray(block?.quotes) ? block.quotes : [];
      counter.set(market, (counter.get(market) ?? 0) + quotes.length);
    }

    return Array.from(counter, ([market, count]) => ({
      market,
      label: getMarketLabel(market),
      count,
    }));
  });

  const allQuotes = computed(() => {
    const rows = [];

    markets.value.forEach((block, marketIndex) => {
      const market = normalizeMarketCode(block?.market);
      const quotes = Array.isArray(block?.quotes) ? block.quotes : [];

      for (let i = 0; i < quotes.length; i += 1) {
        const quote = quotes[i];
        rows.push({
          ...quote,
          market,
          marketLabel: getMarketLabel(market),
          _rowKey: `${market}-${quote?.short_code ?? "UNKNOWN"}-${marketIndex}-${i}`,
        });
      }
    });

    return rows;
  });

  const visibleQuotes = computed(() => {
    if (selectedMarket.value === "ALL") return allQuotes.value;
    return allQuotes.value.filter((row) => row.market === selectedMarket.value);
  });

  const selectedMarketLabel = computed(() => {
    return selectedMarket.value === "ALL" ? "全部" : getMarketLabel(selectedMarket.value);
  });

  async function fetchMarkets({ silent = false } = {}) {
    const shouldShowLoading = !silent || markets.value.length === 0;
    if (shouldShowLoading) loading.value = true;
    if (!silent) error.value = null;

    try {
      const res = await getUserMarkets();
      const payload = getPayload(res, {});

      updatedAt.value = payload?.updated_at ?? "";
      markets.value = Array.isArray(payload?.markets) ? payload.markets : [];

      const availableMarkets = new Set(marketButtons.value.map((x) => x.market));
      if (selectedMarket.value !== "ALL" && !availableMarkets.has(selectedMarket.value)) {
        selectedMarket.value = "ALL";
      }
    } catch (e) {
      if (!silent || markets.value.length === 0) {
        error.value = e;
        markets.value = [];
      }
    } finally {
      if (shouldShowLoading) loading.value = false;
    }
  }

  function clearAutoRefreshTimer() {
    if (!autoRefreshTimer) return;
    clearTimeout(autoRefreshTimer);
    autoRefreshTimer = null;
  }

  function scheduleAutoRefresh() {
    clearAutoRefreshTimer();
    autoRefreshTimer = setTimeout(async () => {
      if (!document.hidden) await fetchMarkets({ silent: true });
      scheduleAutoRefresh();
    }, getMsToNextMinuteTick({
      intervalMinutes: AUTO_REFRESH_MINUTES,
      second: AUTO_REFRESH_SECOND,
    }));
  }

  function handleVisibilityChange() {
    if (!document.hidden) fetchMarkets({ silent: true });
    scheduleAutoRefresh();
  }

  function clearSearchDebounceTimer() {
    if (!searchDebounceTimer) return;
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }

  function applyCachedSearchResult(query) {
    if (!searchResultCache.has(query)) return false;
    searchResults.value = searchResultCache.get(query) || [];
    searchLoading.value = false;
    lastSearchedQuery = query;
    return true;
  }

  function resetSearchUI({ hide = false } = {}) {
    searchLoading.value = false;
    searchResults.value = [];
    if (hide) showSearchDropdown.value = false;
  }

  async function executeSearch(rawQuery) {
    const query = normalizeSearchQuery(rawQuery);

    if (!query) {
      searchRequestSeq += 1;
      lastSearchedQuery = "";
      resetSearchUI({ hide: true });
      return;
    }

    showSearchDropdown.value = true;

    if (query === lastSearchedQuery && (searchResults.value.length > 0 || searchLoading.value)) {
      return;
    }

    if (applyCachedSearchResult(query)) {
      return;
    }

    searchLoading.value = true;
    const reqId = ++searchRequestSeq;

    try {
      const res = await searchMarketInstruments(query);
      if (reqId !== searchRequestSeq) return;

      const payload = getPayload(res, {});
      const rows = Array.isArray(payload?.results) ? payload.results : [];

      searchResults.value = rows;
      searchResultCache.set(query, rows);
      lastSearchedQuery = query;
    } catch {
      if (reqId !== searchRequestSeq) return;
      lastSearchedQuery = "";
      searchResults.value = [];
      ElMessage.error("搜索失败，请稍后重试。");
    } finally {
      if (reqId === searchRequestSeq) searchLoading.value = false;
    }
  }

  function scheduleSearch(rawQuery) {
    clearSearchDebounceTimer();
    searchDebounceTimer = setTimeout(() => executeSearch(rawQuery), SEARCH_DEBOUNCE_MS);
  }

  function onSearchInput() {
    if (isComposing.value) return;

    const query = normalizeSearchQuery(keywordInput.value);
    if (!query) {
      searchRequestSeq += 1;
      lastSearchedQuery = "";
      clearSearchDebounceTimer();
      resetSearchUI({ hide: true });
      return;
    }

    showSearchDropdown.value = true;

    if (query === lastSearchedQuery) {
      applyCachedSearchResult(query);
      return;
    }

    scheduleSearch(query);
  }

  function onSearchEnter() {
    clearSearchDebounceTimer();
    executeSearch(keywordInput.value);
  }

  function onSearchFocus() {
    const query = normalizeSearchQuery(keywordInput.value);
    if (!query) return;

    showSearchDropdown.value = true;

    if (applyCachedSearchResult(query)) {
      return;
    }

    if (query !== lastSearchedQuery) executeSearch(query);
  }

  function onCompositionStart() {
    isComposing.value = true;
  }

  function onCompositionEnd() {
    isComposing.value = false;
    onSearchInput();
  }

  function hideSearchDropdownSoon() {
    setTimeout(() => {
      showSearchDropdown.value = false;
    }, 120);
  }

  async function pickSearchResult(item) {
    const symbol = String(item?.symbol || "").trim();
    if (!symbol) {
      ElMessage.error("标的代码无效，无法添加");
      return;
    }

    try {
      const res = await addWatchlistInstrument(symbol);
      const payload = getPayload(res, {});
      const created = Boolean(payload?.created);
      ElMessage.success(created ? "添加成功" : "该标的已在自选中");
      await fetchMarkets({ silent: true });
    } catch {
      ElMessage.error("添加失败，请稍后重试。");
      return;
    }

    showSearchDropdown.value = false;
  }

  function chooseMarket(market) {
    selectedMarket.value = market;
  }

  async function onDeleteClick(row) {
    const market = normalizeMarketCode(row?.market);
    const shortCode = String(row?.short_code ?? "").trim().toUpperCase();

    if (!market || !shortCode) {
      ElMessage.error("标的代码无效，无法删除");
      return;
    }

    try {
      await deleteWatchlistInstrument({
        market,
        short_code: shortCode,
      });
      ElMessage.success("删除成功");
      await fetchMarkets({ silent: true });
    } catch {
      ElMessage.error("删除失败，请稍后重试。");
    }
  }

  function formatNumber(value, digits = 2) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(digits) : "--";
  }

  function formatPrice(value, marketCode) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "--";

    const prefix = getPricePrefix(marketCode);
    const text = n.toFixed(2);
    return prefix ? `${prefix}${text}` : text;
  }

  function formatVolume(value, marketCode) {
    const market = normalizeMarketCode(marketCode);
    if (market === "FX") {
      const n = Number(value);
      return Number.isFinite(n) && n !== 0 ? n.toFixed(2) : "-";
    }
    return formatNumber(value);
  }

  function formatPercent(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "--";
    return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
  }

  function changeBadgeClass(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-600 dark:bg-gray-700/60 dark:text-gray-300";
    if (n > 0) return "border-green-200 bg-green-50 text-green-700 dark:border-green-700/60 dark:bg-green-900/20 dark:text-green-300";
    if (n < 0) return "border-red-200 bg-red-50 text-red-700 dark:border-red-700/60 dark:bg-red-900/20 dark:text-red-300";
    return "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-700/60 dark:text-gray-200";
  }

  function formatUpdatedAt(value) {
    if (!value) return "--";
    const dt = new Date(value);
    return Number.isNaN(dt.getTime())
      ? String(value)
      : dt.toLocaleString("zh-CN", { hour12: false });
  }

  onMounted(async () => {
    await fetchMarkets();
    scheduleAutoRefresh();
    document.addEventListener("visibilitychange", handleVisibilityChange);
  });

  onUnmounted(() => {
    clearAutoRefreshTimer();
    clearSearchDebounceTimer();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  });

  return {
    allQuotes,
    changeBadgeClass,
    chooseMarket,
    formatPercent,
    formatPrice,
    formatUpdatedAt,
    formatVolume,
    getMarketLabel,
    hideSearchDropdownSoon,
    keywordInput,
    loading,
    marketButtons,
    onCompositionEnd,
    onCompositionStart,
    onDeleteClick,
    onSearchEnter,
    onSearchFocus,
    onSearchInput,
    pickSearchResult,
    searchLoading,
    searchResults,
    selectedMarket,
    selectedMarketLabel,
    showSearchDropdown,
    updatedAt,
    visibleQuotes,
    error,
  };
}
