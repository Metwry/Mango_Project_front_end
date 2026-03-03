import { computed, onMounted, onUnmounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { ElMessage } from "element-plus";
import { searchMarketInstruments } from "@/utils/markets";
import { getPayload } from "@/utils/apiPayload";
import { useMarketStore } from "@/stores/market";

const MARKET_META = {
  CN: { label: "A股", pricePrefix: "¥" },
  CRYPTO: { label: "加密货币", pricePrefix: "$" },
  FX: { label: "外汇", pricePrefix: "" },
  HK: { label: "港股", pricePrefix: "HK$" },
  US: { label: "美股", pricePrefix: "$" },
};
const MARKET_ORDER = ["CN", "HK", "US", "FX", "CRYPTO"];
const MARKET_ORDER_MAP = new Map(MARKET_ORDER.map((market, idx) => [market, idx]));

const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_CACHE_LIMIT = 50;

function normalizeMarketCode(value) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeSearchQuery(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function useMarketPage() {
  const marketStore = useMarketStore();
  const { loading, error, markets, updatedAt, selectedMarket } = storeToRefs(marketStore);

  const keywordInput = ref("");
  const searchLoading = ref(false);
  const searchResults = ref([]);
  const showSearchDropdown = ref(false);
  const isComposing = ref(false);

  let searchDebounceTimer = null;
  let searchRequestSeq = 0;
  let lastSearchedQuery = "";
  const searchResultCache = new Map();

  function getMarketOrderIndex(market) {
    return MARKET_ORDER_MAP.get(market) ?? Number.MAX_SAFE_INTEGER;
  }

  function buildQuoteRowKey(market, quote) {
    const shortCode = String(quote?.short_code ?? "").trim().toUpperCase();
    const symbol = String(quote?.symbol ?? "").trim().toUpperCase();
    const name = String(quote?.name ?? "").trim().toUpperCase();
    return `${market}-${shortCode || symbol || name || "UNKNOWN"}`;
  }

  function getMarketLabel(marketCode) {
    const code = normalizeMarketCode(marketCode);
    return MARKET_META[code]?.label || code || "未知市场";
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
    })).sort((a, b) => {
      const aIdx = getMarketOrderIndex(a.market);
      const bIdx = getMarketOrderIndex(b.market);
      if (aIdx !== bIdx) return aIdx - bIdx;
      return String(a.label).localeCompare(String(b.label), "zh-CN");
    });
  });

  const allQuotes = computed(() => {
    const rows = [];
    const sortedMarkets = [...markets.value].sort((a, b) => {
      const aMarket = normalizeMarketCode(a?.market);
      const bMarket = normalizeMarketCode(b?.market);
      const aIdx = getMarketOrderIndex(aMarket);
      const bIdx = getMarketOrderIndex(bMarket);
      if (aIdx !== bIdx) return aIdx - bIdx;
      return String(aMarket).localeCompare(String(bMarket), "zh-CN");
    });

    sortedMarkets.forEach((block) => {
      const market = normalizeMarketCode(block?.market);
      const quotes = Array.isArray(block?.quotes) ? block.quotes : [];

      for (const quote of quotes) {
        rows.push({
          ...quote,
          market,
          marketLabel: getMarketLabel(market),
          _rowKey: buildQuoteRowKey(market, quote),
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

  function ensureSelectedMarketAvailable() {
    const availableMarkets = new Set(marketButtons.value.map((item) => item.market));
    if (selectedMarket.value !== "ALL" && !availableMarkets.has(selectedMarket.value)) {
      marketStore.setSelectedMarket("ALL");
    }
  }

  function handleVisibilityChange() {
    if (!document.hidden) {
      marketStore
        .refreshMarkets({ silent: true })
        .catch(() => {})
        .finally(() => {
          ensureSelectedMarketAvailable();
        });
    }
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

  function setSearchCache(query, rows) {
    if (searchResultCache.has(query)) {
      searchResultCache.delete(query);
    }
    searchResultCache.set(query, rows);
    if (searchResultCache.size > SEARCH_CACHE_LIMIT) {
      const oldestKey = searchResultCache.keys().next().value;
      if (oldestKey) searchResultCache.delete(oldestKey);
    }
  }

  function resetSearchState({ hide = false, resetLastQuery = false } = {}) {
    clearSearchDebounceTimer();
    searchLoading.value = false;
    searchResults.value = [];
    if (hide) showSearchDropdown.value = false;
    if (resetLastQuery) lastSearchedQuery = "";
  }

  async function executeSearch(rawQuery) {
    const query = normalizeSearchQuery(rawQuery);

    if (!query) {
      searchRequestSeq += 1;
      resetSearchState({ hide: true, resetLastQuery: true });
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
      setSearchCache(query, rows);
      lastSearchedQuery = query;
    } catch {
      if (reqId !== searchRequestSeq) return;
      resetSearchState({ resetLastQuery: true });
    } finally {
      if (reqId === searchRequestSeq) searchLoading.value = false;
    }
  }

  function scheduleSearch(rawQuery) {
    clearSearchDebounceTimer();
    searchDebounceTimer = setTimeout(() => executeSearch(rawQuery), SEARCH_DEBOUNCE_MS);
  }

  function handleEmptySearchInput() {
    searchRequestSeq += 1;
    resetSearchState({ hide: true, resetLastQuery: true });
  }

  function triggerSearch(query, { immediate = false, skipIfSameLast = false } = {}) {
    showSearchDropdown.value = true;

    if (applyCachedSearchResult(query)) return;
    if (skipIfSameLast && query === lastSearchedQuery) return;

    if (immediate) {
      clearSearchDebounceTimer();
      executeSearch(query);
      return;
    }

    scheduleSearch(query);
  }

  function onSearchInput() {
    if (isComposing.value) return;

    const query = normalizeSearchQuery(keywordInput.value);
    if (!query) {
      handleEmptySearchInput();
      return;
    }

    triggerSearch(query, { skipIfSameLast: true });
  }

  function onSearchEnter() {
    const query = normalizeSearchQuery(keywordInput.value);
    if (!query) {
      handleEmptySearchInput();
      return;
    }
    triggerSearch(query, { immediate: true });
  }

  function onSearchFocus() {
    const query = normalizeSearchQuery(keywordInput.value);
    if (!query) return;
    triggerSearch(query, { immediate: true, skipIfSameLast: true });
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
      const payload = await marketStore.addWatchlistInstrument(symbol);
      const created = Boolean(payload?.created);
      ElMessage.success(created ? "添加成功" : "该标的已在自选中");
      ensureSelectedMarketAvailable();
    } catch {
      return;
    }

    showSearchDropdown.value = false;
  }

  function chooseMarket(market) {
    marketStore.setSelectedMarket(market);
  }

  async function onDeleteClick(row) {
    const market = normalizeMarketCode(row?.market);
    const shortCode = String(row?.short_code ?? "").trim().toUpperCase();

    if (!market || !shortCode) {
      ElMessage.error("标的代码无效，无法删除");
      return;
    }

    try {
      await marketStore.deleteWatchlistInstrument({
        market,
        short_code: shortCode,
      });
      ElMessage.success("删除成功");
      ensureSelectedMarketAvailable();
    } catch {}
  }

  function formatPrice(value, marketCode) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "--";

    const prefix = MARKET_META[normalizeMarketCode(marketCode)]?.pricePrefix ?? "";
    const text = n.toFixed(2);
    return prefix ? `${prefix}${text}` : text;
  }

  function formatVolume(value, marketCode) {
    const market = normalizeMarketCode(marketCode);
    if (market === "FX") {
      const n = Number(value);
      return Number.isFinite(n) && n !== 0 ? n.toFixed(2) : "-";
    }
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "--";
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
    try {
      await marketStore.fetchMarkets();
    } catch {}
    ensureSelectedMarketAvailable();
    marketStore.startMarketAutoRefresh();
    document.addEventListener("visibilitychange", handleVisibilityChange);
  });

  onUnmounted(() => {
    marketStore.stopMarketAutoRefresh();
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
