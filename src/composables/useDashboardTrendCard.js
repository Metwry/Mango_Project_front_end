import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useDashboardDisplayCurrency } from "@/composables/useDashboardDisplayCurrency";
import { getAccountColorById } from "@/utils/accountColors";
import { formatCurrencyAmount } from "@/utils/formatters";
import { createMinuteAlignedScheduler } from "@/utils/refreshScheduler";
import { AUTO_REFRESH_ENABLED, DASHBOARD_TREND_CONFIG } from "@/config/Config";
import {
  DEFAULT_USD_PER_CURRENCY_RATES,
  ensureUsdPerCurrencyRates,
  resolveUsdPerCurrencyRate,
} from "@/utils/fxRates";
import { buildSnapshotTimeline, getAccountSnapshots } from "@/utils/snapshot";

const RANGE_OPTIONS = DASHBOARD_TREND_CONFIG.rangeOptions;
const ALL_ACCOUNTS_THEME_COLOR = DASHBOARD_TREND_CONFIG.allAccountsThemeColor;
const TODAY_AUTO_REFRESH_INTERVAL_MINUTES = DASHBOARD_TREND_CONFIG.todayAutoRefresh.intervalMinutes;
const TODAY_AUTO_REFRESH_SECOND = DASHBOARD_TREND_CONFIG.todayAutoRefresh.second;
const TREND_FONT_FAMILY = "\"Times New Roman\", Times, serif";

function toPositiveInt(value) {
  const n = Number(value);
  return n > 0 ? Math.trunc(n) : null;
}

function normalizeCurrency(value) {
  return String(value ?? "USD").trim().toUpperCase();
}

function toIsoWindow(days) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function limitSeriesPoints(points, maxPoints = DASHBOARD_TREND_CONFIG.maxRenderPoints) {
  if (points.length <= maxPoints) return points;

  const result = [];
  const lastIndex = points.length - 1;
  const step = lastIndex / (maxPoints - 1);

  for (let i = 0; i < maxPoints; i += 1) {
    const index = Math.round(i * step);
    result.push(points[Math.min(lastIndex, index)]);
  }

  return result;
}

function formatTimelineLabel(ts, rangeKey) {
  const rawMs = new Date(ts).getTime();
  const date = new Date(rawMs + 8 * 60 * 60 * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");

  if (rangeKey === "today") return `${hh}:${mm}`;
  if (rangeKey === "all" || rangeKey === "1y") return `${y}-${m}-${d}`;
  if (rangeKey === "30d") return `${m}-${d}`;
  return `${m}-${d} ${hh}:${mm}`;
}

function formatPlainAmount(value) {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatAxisAmount(value, currencyCode = "") {
  if (!currencyCode) return formatPlainAmount(value);

  return formatCurrencyAmount(value, currencyCode, {
    symbolOnly: true,
    fallbackWithCode: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatTooltipAmount(value, currencyCode = "") {
  if (!currencyCode) {
    return new Intl.NumberFormat("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  return formatCurrencyAmount(value, currencyCode, {
    symbolOnly: true,
    fallbackWithCode: true,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function useDashboardTrendCard(accounts) {
  const accountId = ref("");
  const activeRangeKey = ref("today");
  const loading = ref(false);
  const queryError = ref(null);
  const snapshotSeries = ref([]);
  const usdPerCurrencyRates = ref({ ...DEFAULT_USD_PER_CURRENCY_RATES });
  const axisStartMs = ref(0);
  const axisIntervalMs = ref(0);
  let requestSeq = 0;
  let todayAutoRefreshScheduler = null;
  const { displayCurrency } = useDashboardDisplayCurrency();

  const rangeMeta = computed(() => (
    RANGE_OPTIONS.find((item) => item.key === activeRangeKey.value) ?? RANGE_OPTIONS[0]
  ));

  const activeRangeMaxRenderPoints = computed(() => (
    Number(rangeMeta.value.maxRenderPoints) || DASHBOARD_TREND_CONFIG.maxRenderPoints
  ));

  const selectedAccountId = computed(() => toPositiveInt(accountId.value));
  const accountById = computed(() => new Map(
    accounts.value.map((item) => [Number(item.id), item]),
  ));

  async function fetchTrendData() {
    const { start, end } = rangeMeta.value.key === "today"
      ? toIsoWindow(1)
      : toIsoWindow(rangeMeta.value.days);

    const params = {
      level: rangeMeta.value.level,
      start_time: start,
      end_time: end,
      limit: DASHBOARD_TREND_CONFIG.snapshotLimit,
    };
    if (selectedAccountId.value) params.account_id = selectedAccountId.value;

    loading.value = true;
    queryError.value = null;
    const reqId = ++requestSeq;

    try {
      const [snapshotRes, nextUsdPerCurrencyRates] = await Promise.all([
        getAccountSnapshots(params),
        ensureUsdPerCurrencyRates(),
      ]);

      if (reqId !== requestSeq) return;

      const { meta, series } = snapshotRes.data;
      const timeline = buildSnapshotTimeline(meta);
      usdPerCurrencyRates.value = {
        ...DEFAULT_USD_PER_CURRENCY_RATES,
        ...nextUsdPerCurrencyRates,
        USD: 1,
      };

      axisStartMs.value = new Date(meta.axis_start_time).getTime();
      axisIntervalMs.value = Number(meta.interval_seconds) * 1000;

      snapshotSeries.value = series
        .map((item) => {
          let firstValidIndex = -1;
          let lastValidIndex = -1;

          const usdData = timeline.flatMap((ts, index) => {
            const rawValue = item.balance_usd[index];
            if (rawValue === null) return [];

            if (firstValidIndex < 0) firstValidIndex = index;
            lastValidIndex = index;
            return [[ts, Number(rawValue)]];
          });

          if (usdData.length === 0) return null;

          return {
            accountId: item.account_id,
            snapshotAccountName: item.account_name,
            snapshotCurrency: item.account_currency,
            firstValidIndex,
            lastValidIndex,
            usdData,
          };
        })
        .filter(Boolean);
    } catch (error) {
      if (reqId !== requestSeq) return;
      queryError.value = error;
      snapshotSeries.value = [];
      axisStartMs.value = 0;
      axisIntervalMs.value = 0;
    } finally {
      if (reqId === requestSeq) loading.value = false;
    }
  }

  function startTodayAutoRefresh() {
    if (!AUTO_REFRESH_ENABLED || todayAutoRefreshScheduler) return;

    todayAutoRefreshScheduler = createMinuteAlignedScheduler({
      intervalMinutes: TODAY_AUTO_REFRESH_INTERVAL_MINUTES,
      second: TODAY_AUTO_REFRESH_SECOND,
      task: async () => {
        if (activeRangeKey.value !== "today") return;
        await fetchTrendData();
      },
      onError: () => {},
    });

    todayAutoRefreshScheduler.start();
  }

  function stopTodayAutoRefresh() {
    if (!todayAutoRefreshScheduler) return;
    todayAutoRefreshScheduler.stop();
    todayAutoRefreshScheduler = null;
  }

  watch([activeRangeKey, accountId], () => {
    void fetchTrendData();
  }, { immediate: true });

  onMounted(() => {
    startTodayAutoRefresh();
  });

  onUnmounted(() => {
    requestSeq += 1;
    stopTodayAutoRefresh();
  });

  function resolveSeriesAccount(entry) {
    return accountById.value.get(entry.accountId) ?? {
      name: entry.snapshotAccountName,
      currency: entry.snapshotCurrency,
    };
  }

  function buildAccountSeriesData(entry) {
    const account = resolveSeriesAccount(entry);
    const usdPerCurrencyRate = resolveUsdPerCurrencyRate(account, usdPerCurrencyRates.value);

    return entry.usdData.map(([ts, usdValue]) => [ts, usdValue / usdPerCurrencyRate]);
  }

  const chartSeries = computed(() => {
    if (!snapshotSeries.value.length) return [];

    if (!selectedAccountId.value) {
      const usdTotalsByTs = new Map();
      snapshotSeries.value.forEach((entry) => {
        entry.usdData.forEach(([ts, usdValue]) => {
          usdTotalsByTs.set(ts, (usdTotalsByTs.get(ts) ?? 0) + usdValue);
        });
      });

      const displayUsdRate = resolveUsdPerCurrencyRate(displayCurrency.value, usdPerCurrencyRates.value);
      const data = Array.from(usdTotalsByTs.entries())
        .map(([ts, totalUsd]) => [ts, totalUsd / displayUsdRate])
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

      if (!data.length) return [];

      const limitedData = limitSeriesPoints(data, activeRangeMaxRenderPoints.value);
      const singlePoint = limitedData.length === 1;

      return [{
        id: `account-all-${displayCurrency.value.toLowerCase()}`,
        name: "全部账户",
        accountId: "all_accounts",
        accountCurrency: displayCurrency.value,
        type: "line",
        smooth: true,
        showSymbol: singlePoint,
        symbol: singlePoint ? "circle" : "none",
        symbolSize: singlePoint ? 7 : 4,
        sampling: "lttb",
        itemStyle: { color: ALL_ACCOUNTS_THEME_COLOR },
        lineStyle: {
          color: ALL_ACCOUNTS_THEME_COLOR,
          width: DASHBOARD_TREND_CONFIG.lineWidth.allAccounts,
        },
        emphasis: { focus: "series" },
        data: limitedData,
      }];
    }

    return snapshotSeries.value.map((entry) => {
      const account = resolveSeriesAccount(entry);
      const limitedData = limitSeriesPoints(buildAccountSeriesData(entry), activeRangeMaxRenderPoints.value);
      const accountName = account.name;
      const singlePoint = limitedData.length === 1;
      const seriesColor = getAccountColorById(accountName || entry.accountId);

      return {
        id: `account-${entry.accountId}`,
        name: accountName,
        accountId: entry.accountId,
        accountCurrency: normalizeCurrency(account.currency),
        type: "line",
        smooth: true,
        showSymbol: singlePoint,
        symbol: singlePoint ? "circle" : "none",
        symbolSize: singlePoint ? 7 : 4,
        sampling: "lttb",
        itemStyle: { color: seriesColor },
        lineStyle: {
          color: seriesColor,
          width: DASHBOARD_TREND_CONFIG.lineWidth.account,
        },
        emphasis: { focus: "series" },
        data: limitedData,
      };
    });
  });

  const hasData = computed(() => chartSeries.value.length > 0);

  const chartSeriesById = computed(() => new Map(
    chartSeries.value.map((item) => [String(item.id), item]),
  ));

  const yAxisCurrency = computed(() => {
    if (!selectedAccountId.value) return displayCurrency.value;
    return normalizeCurrency(resolveSeriesAccount(
      snapshotSeries.value.find((item) => item.accountId === selectedAccountId.value),
    )?.currency);
  });

  const xAxisBounds = computed(() => {
    if (axisStartMs.value > 0 && axisIntervalMs.value > 0) {
      const ranges = snapshotSeries.value.map((item) => [item.firstValidIndex, item.lastValidIndex]);
      if (ranges.length) {
        const min = axisStartMs.value + Math.min(...ranges.map((item) => item[0])) * axisIntervalMs.value;
        const max = axisStartMs.value + Math.max(...ranges.map((item) => item[1])) * axisIntervalMs.value;
        if (min === max) {
          const pad = Math.max(axisIntervalMs.value / 2, 60 * 1000);
          return { min: min - pad, max: max + pad };
        }
        return { min, max };
      }
    }

    const allTimes = chartSeries.value
      .flatMap((item) => item.data.map((point) => new Date(point[0]).getTime()))
      .sort((a, b) => a - b);

    if (!allTimes.length) return null;
    if (allTimes[0] === allTimes[allTimes.length - 1]) {
      const pad = Math.max(axisIntervalMs.value / 2, 60 * 1000);
      return { min: allTimes[0] - pad, max: allTimes[0] + pad };
    }
    return { min: allTimes[0], max: allTimes[allTimes.length - 1] };
  });

  const chartOption = computed(() => ({
    textStyle: {
      fontFamily: TREND_FONT_FAMILY,
    },
    grid: {
      left: 10,
      right: 12,
      top: 28,
      bottom: 16,
      outerBoundsMode: "same",
      outerBoundsContain: "axisLabel",
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "line" },
      textStyle: {
        fontFamily: TREND_FONT_FAMILY,
        fontSize: 13,
      },
      extraCssText: "font-family:'Times New Roman',Times,serif;font-size:13px;",
      formatter: (params) => {
        const rows = Array.isArray(params) ? params : [params];
        const ts = String(rows[0].value[0]);
        const lines = rows.map((item) => {
          const seriesItem = chartSeriesById.value.get(String(item.seriesId));
          return `${item.marker}${item.seriesName}: ${formatTooltipAmount(item.value[1], seriesItem?.accountCurrency ?? yAxisCurrency.value)}`;
        });

        return [formatTimelineLabel(ts, activeRangeKey.value), ...lines].join("<br/>");
      },
    },
    legend: {
      top: 0,
      right: 0,
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
      textStyle: {
        color: "#6b7280",
        fontFamily: TREND_FONT_FAMILY,
        fontSize: 13,
      },
    },
    xAxis: {
      type: "time",
      min: xAxisBounds.value?.min,
      max: xAxisBounds.value?.max,
      boundaryGap: false,
      axisLine: { lineStyle: { color: "#cbd5e1" } },
      axisTick: { show: false },
      axisLabel: {
        color: "#94a3b8",
        fontFamily: TREND_FONT_FAMILY,
        fontSize: 13,
        hideOverlap: true,
        showMinLabel: true,
        showMaxLabel: true,
        formatter: (value) => formatTimelineLabel(value, activeRangeKey.value),
      },
    },
    yAxis: {
      type: "value",
      min: DASHBOARD_TREND_CONFIG.yAxisMin,
      scale: true,
      splitNumber: 5,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: "#94a3b8",
        fontFamily: TREND_FONT_FAMILY,
        fontSize: 13,
        formatter: (value) => formatAxisAmount(value, yAxisCurrency.value),
      },
      splitLine: { show: false },
    },
    series: chartSeries.value,
  }));

  return {
    RANGE_OPTIONS,
    accountId,
    activeRangeKey,
    loading,
    queryError,
    hasData,
    chartOption,
  };
}
