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

const AUTO_REFRESH_INTERVAL_MINUTES = STORE_REFRESH_CONFIG.investmentQuotes.intervalMinutes;
const AUTO_REFRESH_SECOND = STORE_REFRESH_CONFIG.investmentQuotes.second;

// 将输入值转换成有限数字，失败时返回 null。
function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// 将数量或价格规范化为正数的小数字符串。
function toPositiveDecimalString(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toFixed(6);
}

// 规范化标的 Logo 地址字段。
function normalizeLogoUrl(raw) {
  const url = String(raw?.logo_url ?? "").trim();
  return url || "";
}

// 规范化标的 Logo 主色，并兼容三位和六位十六进制格式。
function normalizeLogoColor(raw) {
  const color = String(raw?.logo_color ?? "").trim().toUpperCase();

  if (/^#[0-9A-F]{6}$/.test(color)) return color;
  if (/^#[0-9A-F]{3}$/.test(color)) {
    const r = color[1];
    const g = color[2];
    const b = color[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "";
}

// 将持仓原始数据标准化为前端统一使用的结构。
function normalizePosition(raw) {
  const instrumentId = toFiniteNumber(raw?.instrument_id);
  const accountId = toFiniteNumber(raw?.account_id);
  const shortCode = String(raw?.short_code ?? "").trim().toUpperCase();
  const stockName = String(raw?.name ?? "").trim();
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
    const key = `${String(row?.marketType ?? "").toUpperCase()}__${String(row?.shortCode ?? "").toUpperCase()}`;
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

// 管理投资持仓、最新行情和买卖交易逻辑。
export const useInvestmentStore = defineStore("investment", () => {
  const positions = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const trading = ref(false);

  const fetched = ref(false);

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

  // 规范化买卖交易的提交参数。
  function normalizeTradePayload(raw) {
    const instrumentId = Number(raw?.instrument_id);
    const quantity = toPositiveDecimalString(raw?.quantity);
    const price = toPositiveDecimalString(raw?.price);
    const cashAccountId = Number(raw?.cash_account_id);

    return {
      instrument_id: Number.isFinite(instrumentId) ? Math.trunc(instrumentId) : null,
      quantity,
      price,
      cash_account_id: Number.isFinite(cashAccountId) ? Math.trunc(cashAccountId) : null,
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
    if (quotePromise.value) return quotePromise.value;

    if (!silent) error.value = null;

    const p = (async () => {
      try {
        const quoteRes = await getLatestMarketQuotes({ items: quoteItems });
        const quotePayload = quoteRes.data ?? {};
        const quoteRows = Array.isArray(quotePayload?.quotes) ? quotePayload.quotes : [];
        positions.value = applyLatestQuotes(positions.value, quoteRows);
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

  // 拉取持仓列表，并在成功后补充最新行情数据。
  async function fetchPositions({ force = false, silent = false } = {}) {
    if (fetchPromise.value) return fetchPromise.value;
    if (fetched.value && !force) return positions.value;

    if (!silent) loading.value = true;
    if (!silent) error.value = null;

    const p = (async () => {
      try {
        const res = await getInvestmentPositions();
        const rows = Array.isArray(res.data) ? res.data : [];
        positions.value = rows.map((item) => normalizePosition(item));

        fetched.value = true;

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

  // 根据买卖模式提交交易，并在成功后刷新相关数据。
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
    try {
      if (!isValidPayload) {
        throw new Error("交易参数不完整，请刷新后重试");
      }
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
    loading.value = false;
    error.value = null;
    trading.value = false;

    fetched.value = false;
    fetchPromise.value = null;
    quotePromise.value = null;
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

