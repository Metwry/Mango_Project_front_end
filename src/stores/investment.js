import { defineStore } from "pinia";
import { ref } from "vue";
import {
  buyInvestmentPosition as apiBuyInvestmentPosition,
  getInvestmentPositions,
  getLatestMarketQuotes,
  sellInvestmentPosition as apiSellInvestmentPosition,
} from "@/utils/investment";
import { createMinuteAlignedScheduler } from "@/utils/refreshScheduler";
import { AUTO_REFRESH_ENABLED, STORE_REFRESH_CONFIG } from "@/config/Config";
import { useAsyncState } from "@/composables/useAsyncState";

const AUTO_REFRESH_INTERVAL_MINUTES = STORE_REFRESH_CONFIG.investmentQuotes.intervalMinutes;
const AUTO_REFRESH_SECOND = STORE_REFRESH_CONFIG.investmentQuotes.second;

// 将数量或价格规范化为正数的小数字符串。
function toPositiveDecimalString(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toFixed(6);
}

// 规范化标的 Logo 地址字段。
function normalizeLogoUrl(raw) {
  return String(raw?.logo_url ?? "").trim();
}

// 规范化标的 Logo 主色。
function normalizeLogoColor(raw) {
  return String(raw?.logo_color ?? "").trim().toUpperCase();
}

// 将持仓原始数据标准化为前端统一使用的结构。
function normalizePosition(raw) {
  const shortCode = String(raw.short_code).trim().toUpperCase();
  const stockName = String(raw.name).trim();
  const marketType = String(raw.market_type).trim().toUpperCase();
  const costPrice = Number(raw.current_cost_price);
  const quantity = Number(raw.current_quantity);
  const currentValue = Number(raw.current_value);
  const impliedCurrentPrice = quantity > 0 ? currentValue / quantity : null;

  return {
    instrumentId: raw.instrument_id,
    accountId: raw.account_id ?? null,
    shortCode,
    symbol: shortCode,
    name: stockName || shortCode || "未命名股票",
    logoUrl: normalizeLogoUrl(raw),
    logoColor: normalizeLogoColor(raw),
    logoText: (stockName || shortCode || "").slice(0, 2).toUpperCase(),
    marketType,
    costPrice,
    quantity,
    currentValue,
    currentPrice: impliedCurrentPrice,
  };
}

// 从持仓列表中提取请求最新行情所需的标的集合。
function buildQuoteItems(rows) {
  const dedup = new Set();
  const items = [];

  rows.forEach((row) => {
    const market = String(row?.marketType ?? "").trim().toUpperCase();
    const shortCode = String(row?.shortCode ?? "").trim().toUpperCase();
    if (!market || !shortCode) return;

    const key = `${market}__${shortCode}`;
    if (dedup.has(key)) return;
    dedup.add(key);
    items.push({ market, short_code: shortCode });
  });

  return items;
}

// 将最新行情价格合并回当前持仓列表。
function applyLatestQuotes(rows, quotes) {
  const latestMap = new Map();

  quotes.forEach((quote) => {
    const market = String(quote.market).trim().toUpperCase();
    const shortCode = String(quote.short_code).trim().toUpperCase();
    const latestPrice = quote.latest_price === null ? null : Number(quote.latest_price);
    const logoUrl = normalizeLogoUrl(quote);
    const logoColor = normalizeLogoColor(quote);

    latestMap.set(`${market}__${shortCode}`, { latestPrice, logoUrl, logoColor });
  });

  return rows.map((row) => {
    const key = `${row.marketType}__${row.shortCode}`;
    const quote = latestMap.get(key) ?? null;
    const price = quote?.latestPrice;
    return {
      ...row,
      logoUrl: quote?.logoUrl || row?.logoUrl || "",
      logoColor: quote?.logoColor || row?.logoColor || "",
      currentPrice: price,
      currentValue: price === null ? row?.currentValue ?? null : price * row.quantity,
    };
  });
}

// 管理投资持仓、最新行情和买卖交易逻辑。
export const useInvestmentStore = defineStore("investment", () => {
  const positions = ref([]);
  const trading = ref(false);

  const { loading, error, fetched, run: runFetch, reset: resetFetch } = useAsyncState();
  const { promise: quotePromise, run: runQuote, reset: resetQuote } = useAsyncState();

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

  // 规范化买卖交易的提交参数。
  function normalizeTradePayload(raw) {
    return {
      instrument_id: Math.trunc(Number(raw?.instrument_id)),
      quantity: toPositiveDecimalString(raw?.quantity),
      price: toPositiveDecimalString(raw?.price),
      cash_account_id: Math.trunc(Number(raw?.cash_account_id)),
    };
  }

  // 在交易完成后尝试刷新账户余额数据。
  async function refreshAccountsAfterTrade() {
    try {
      const { useAccountsStore } = await import("@/stores/accounts");
      await useAccountsStore().fetchAccounts({ force: true });
    } catch {
      // Ignore accounts refresh failures; trade itself already completed.
    }
  }

  // 启动持仓行情自动刷新调度器。
  function startInvestmentAutoRefresh() {
    if (!AUTO_REFRESH_ENABLED) return;
    autoRefreshScheduler.start();
  }

  // 停止持仓行情自动刷新调度器。
  function stopInvestmentAutoRefresh() {
    autoRefreshScheduler.stop();
  }

  // 拉取当前持仓对应的最新行情并更新估值。
  async function refreshLatestQuotes({ silent = true } = {}) {
    const quoteItems = buildQuoteItems(positions.value);
    if (quoteItems.length === 0) return positions.value;

    return runQuote({ silent }, async () => {
      const quoteRes = await getLatestMarketQuotes({ items: quoteItems });
      positions.value = applyLatestQuotes(positions.value, quoteRes.data.quotes);
      return positions.value;
    });
  }

  // 拉取持仓列表，并在成功后补充最新行情数据。
  async function fetchPositions({ force = false, silent = false } = {}) {
    return runFetch({ force, silent, getCached: () => positions.value }, async () => {
      const res = await getInvestmentPositions();
      positions.value = res.data.map((item) => normalizePosition(item));
      await refreshLatestQuotes({ silent: true });
      return positions.value;
    });
  }

  // 根据买卖模式提交交易，并在成功后刷新相关数据。
  async function submitTrade(mode, payload) {
    const apiFn = mode === "buy" ? apiBuyInvestmentPosition : apiSellInvestmentPosition;
    const normalized = normalizeTradePayload(payload);

    trading.value = true;
    try {
      const res = await apiFn(normalized);
      await Promise.all([
        fetchPositions({ force: true }),
        refreshAccountsAfterTrade(),
      ]);
      return res.data ?? {};
    } finally {
      trading.value = false;
    }
  }

  // 提交一次买入交易。
  function buyPosition(payload) {
    return submitTrade("buy", payload);
  }

  // 提交一次卖出交易。
  function sellPosition(payload) {
    return submitTrade("sell", payload);
  }

  // 重置投资 store 的全部状态并停止自动刷新。
  function reset() {
    stopInvestmentAutoRefresh();
    positions.value = [];
    trading.value = false;
    resetFetch();
    resetQuote();
  }

  return {
    positions,
    loading,
    error,
    trading,

    fetchPositions,
    refreshLatestQuotes,
    buyPosition,
    sellPosition,
    startInvestmentAutoRefresh,
    stopInvestmentAutoRefresh,
    reset,
  };
});
