import { computed, onMounted, ref } from "vue";
import { useDebounceFn, useEventListener } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { ElMessage } from "@/utils/element";
import { searchMarketInstruments } from "@/utils/markets";
import { useMarketStore } from "@/stores/market";
import {
  getMarketLabel,
  getMarketPricePrefix,
  normalizeMarketCode,
} from "@/utils/marketMeta";
import { AUTO_REFRESH_ENABLED, SEARCH_CONFIG } from "@/config/Config";

const MARKET_ORDER = ["CN", "HK", "US", "FX", "CRYPTO"];
const MARKET_ORDER_MAP = new Map(MARKET_ORDER.map((market, idx) => [market, idx]));
const SEARCH_DEBOUNCE_MS = SEARCH_CONFIG.marketPage.debounceMs;

// 规范化搜索关键词，去掉首尾空格并压缩中间空白。
function normalizeSearchQuery(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

// 获取市场在预设排序中的位置，用于稳定排序。
function getMarketOrderIndex(market) {
  return MARKET_ORDER_MAP.get(market) ?? Number.MAX_SAFE_INTEGER;
}

// 为行情表格行生成稳定的唯一键。
function buildQuoteRowKey(market, quote) {
  const shortCode = String(quote?.short_code ?? "").trim().toUpperCase();
  return `${market}-${shortCode || "UNKNOWN"}`;
}

// 提供行情页面的列表展示、搜索、自选管理和格式化逻辑。
export function useMarketPage() {
  const marketStore = useMarketStore();
  const { loading, error, markets, updatedAt, selectedMarket } = storeToRefs(marketStore);

  const keywordInput = ref("");
  const searchLoading = ref(false);
  const searchResults = ref([]);
  const showSearchDropdown = ref(false);
  const isComposing = ref(false);

  let searchRequestSeq = 0;

  // 生成顶部市场筛选按钮及每个市场对应的数量。
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

  // 将按市场分组的行情数据展开成表格所需的一维列表。
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
      quotes.forEach((quote) => {
        rows.push({
          ...quote,
          market,
          marketLabel: getMarketLabel(market),
          _rowKey: buildQuoteRowKey(market, quote),
        });
      });
    });

    return rows;
  });

  // 根据当前选中的市场筛选需要展示的行情列表。
  const visibleQuotes = computed(() => {
    if (selectedMarket.value === "ALL") return allQuotes.value;
    return allQuotes.value.filter((row) => row.market === selectedMarket.value);
  });

  // 返回当前选中市场对应的显示文案。
  const selectedMarketLabel = computed(() => {
    return selectedMarket.value === "ALL" ? "全部" : getMarketLabel(selectedMarket.value);
  });

  // 当当前市场已不可用时，自动回退到全部市场。
  function ensureSelectedMarketAvailable() {
    const availableMarkets = new Set(marketButtons.value.map((item) => item.market));
    if (selectedMarket.value !== "ALL" && !availableMarkets.has(selectedMarket.value)) {
      marketStore.setSelectedMarket("ALL");
    }
  }

  // 重置搜索相关状态，并可按需隐藏下拉框。
  function resetSearchState({ hide = false } = {}) {
    searchLoading.value = false;
    searchResults.value = [];
    if (hide) showSearchDropdown.value = false;
  }

  // 处理空搜索输入，终止当前搜索并清理下拉状态。
  function handleEmptySearchInput() {
    searchRequestSeq += 1;
    resetSearchState({ hide: true });
  }

  // 执行市场搜索，并处理竞态和错误回退。
  async function executeSearch(rawQuery) {
    const query = normalizeSearchQuery(rawQuery);
    if (query !== normalizeSearchQuery(keywordInput.value)) return;
    if (!query) {
      handleEmptySearchInput();
      return;
    }

    showSearchDropdown.value = true;
    searchLoading.value = true;
    const reqId = ++searchRequestSeq;

    try {
      const res = await searchMarketInstruments(query);
      if (reqId !== searchRequestSeq) return;

      const rows = Array.isArray(res.data?.results) ? res.data.results : [];
      searchResults.value = rows;
    } catch {
      if (reqId !== searchRequestSeq) return;
      resetSearchState();
    } finally {
      if (reqId === searchRequestSeq) searchLoading.value = false;
    }
  }

  // 以防抖方式触发搜索，减少连续输入带来的请求次数。
  const searchWithDebounce = useDebounceFn((query) => {
    void executeSearch(query);
  }, SEARCH_DEBOUNCE_MS);

  // 在输入框失焦后延迟隐藏搜索下拉，保证点击结果时不被提前关闭。
  const hideSearchDropdownSoon = useDebounceFn(() => {
    showSearchDropdown.value = false;
  }, 120);

  // 按需以即时或防抖方式触发搜索流程。
  function triggerSearch(query, { immediate = false } = {}) {
    showSearchDropdown.value = true;

    if (immediate) {
      void executeSearch(query);
      return;
    }

    searchWithDebounce(query);
  }

  // 响应输入框内容变化并触发搜索。
  function onSearchInput() {
    if (isComposing.value) return;

    const query = normalizeSearchQuery(keywordInput.value);
    if (!query) {
      handleEmptySearchInput();
      return;
    }

    triggerSearch(query);
  }

  // 在用户按下回车时立即执行搜索。
  function onSearchEnter() {
    const query = normalizeSearchQuery(keywordInput.value);
    if (!query) {
      handleEmptySearchInput();
      return;
    }
    triggerSearch(query, { immediate: true });
  }

  // 输入框获取焦点时，如果已有关键词则立即显示搜索结果。
  function onSearchFocus() {
    const query = normalizeSearchQuery(keywordInput.value);
    if (!query) return;
    triggerSearch(query, { immediate: true });
  }

  // 标记输入法组合输入开始，避免中途触发搜索。
  function onCompositionStart() {
    isComposing.value = true;
  }

  // 标记输入法组合输入结束，并补一次搜索触发。
  function onCompositionEnd() {
    isComposing.value = false;
    onSearchInput();
  }

  // 选择一个搜索结果并尝试加入自选列表。
  async function pickSearchResult(item) {
    const symbol = String(item?.symbol ?? "").trim().toUpperCase();
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

  // 切换当前展示的市场分类。
  function chooseMarket(market) {
    marketStore.setSelectedMarket(market);
  }

  // 从自选列表中删除一条行情标的。
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

  // 格式化价格字段，并按市场补充价格前缀。
  function formatPrice(value, marketCode) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "--";

    const prefix = getMarketPricePrefix(marketCode);
    const text = n.toFixed(2);
    return prefix ? `${prefix}${text}` : text;
  }

  // 格式化成交量字段，并兼容外汇市场的特殊显示规则。
  function formatVolume(value, marketCode) {
    const market = normalizeMarketCode(marketCode);
    if (market === "FX") {
      const n = Number(value);
      return Number.isFinite(n) && n !== 0 ? n.toFixed(2) : "-";
    }
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "--";
  }

  // 格式化涨跌幅文本，并保留正负号。
  function formatPercent(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "--";
    return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
  }

  // 根据涨跌幅返回对应的徽标样式类名。
  function changeBadgeClass(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-600 dark:bg-gray-700/60 dark:text-gray-300";
    if (n > 0) return "border-green-200 bg-green-50 text-green-700 dark:border-green-700/60 dark:bg-green-900/20 dark:text-green-300";
    if (n < 0) return "border-red-200 bg-red-50 text-red-700 dark:border-red-700/60 dark:bg-red-900/20 dark:text-red-300";
    return "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-700/60 dark:text-gray-200";
  }

  // 格式化行情更新时间文本。
  function formatUpdatedAt(value) {
    if (!value) return "--";
    const dt = new Date(value);
    return Number.isNaN(dt.getTime())
      ? String(value)
      : dt.toLocaleString("zh-CN", { hour12: false });
  }

  // 页面重新可见时静默刷新行情数据。
  function handleVisibilityChange() {
    if (!AUTO_REFRESH_ENABLED) return;
    if (document.hidden) return;
    marketStore
      .refreshMarkets({ silent: true })
      .catch(() => {})
      .finally(() => {
        ensureSelectedMarketAvailable();
      });
  }

  onMounted(async () => {
    try {
      await marketStore.fetchMarkets();
    } catch {}
    ensureSelectedMarketAvailable();
  });

  if (AUTO_REFRESH_ENABLED && typeof document !== "undefined") {
    useEventListener(document, "visibilitychange", handleVisibilityChange);
  }

  return {
    allQuotes,
    changeBadgeClass,
    chooseMarket,
    error,
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
  };
}

