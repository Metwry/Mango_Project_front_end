<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import VChart from "vue-echarts";
import SmallAccountPicker from "@/components/ui/SmallAccountPicker.vue";
import { getPayload } from "@/utils/api";
import { getAccountColorById } from "@/utils/accountColors";
import { formatCurrencyAmount } from "@/utils/formatters";
import { createMinuteAlignedScheduler } from "@/utils/refreshScheduler";
import { AUTO_REFRESH_ENABLED, DASHBOARD_TREND_CONFIG } from "@/config/Config";
import {
  DEFAULT_USD_PER_CURRENCY_RATES,
  ensureUsdPerCurrencyRates,
  getCachedUsdPerCurrencyRates,
  getUsdPerCnyRate,
  resolveUsdPerCurrencyRate,
} from "@/utils/fxRates";
import { buildSnapshotTimeline, getAccountSnapshots } from "@/utils/snapshot";

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent]);

const props = defineProps({
  accounts: {
    type: Array,
    default: () => [],
  },
});

const RANGE_OPTIONS = DASHBOARD_TREND_CONFIG.rangeOptions;
const ALL_ACCOUNTS_THEME_COLOR = DASHBOARD_TREND_CONFIG.allAccountsThemeColor;
const MAX_RENDER_POINTS = DASHBOARD_TREND_CONFIG.maxRenderPoints;
const TODAY_AUTO_REFRESH_INTERVAL_MINUTES = DASHBOARD_TREND_CONFIG.todayAutoRefresh.intervalMinutes;
const TODAY_AUTO_REFRESH_SECOND = DASHBOARD_TREND_CONFIG.todayAutoRefresh.second;

const accountId = ref("");
const activeRangeKey = ref("today");
const loading = ref(false);
const queryError = ref(null);
const snapshotSeries = ref([]);
const usdPerCnyRate = ref(DEFAULT_USD_PER_CURRENCY_RATES.CNY);
const axisStartMs = ref(0);
const axisIntervalMs = ref(0);
let requestSeq = 0;
let todayAutoRefreshScheduler = null;

const rangeMeta = computed(() => {
  return RANGE_OPTIONS.find((item) => item.key === activeRangeKey.value)
    ?? RANGE_OPTIONS.find((item) => item.key === "today")
    ?? RANGE_OPTIONS[0];
});

const hasData = computed(() => chartSeries.value.length > 0);
const selectedAccountId = computed(() => toPositiveInt(accountId.value));
const accountById = computed(() => {
  const map = new Map();
  (props.accounts || []).forEach((item) => {
    const id = toPositiveInt(item?.id);
    if (!id) return;
    map.set(id, item);
  });
  return map;
});

function toPositiveInt(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function normalizeCurrency(value) {
  const code = String(value ?? "").trim().toUpperCase();
  return code || "USD";
}

function resolveAccountName(row) {
  const name = String(row?.account_name ?? "").trim();
  if (name) return name;

  const id = toPositiveInt(row?.account_id);
  if (!id) return "未命名账户";

  const found = (props.accounts || []).find((item) => Number(item?.id) === id);
  return String(found?.name ?? `账户#${id}`);
}

function toIsoWindow(days) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function toTodayIsoWindow() {
  const end = new Date();
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function toSnapshotNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function limitSeriesPoints(points, maxPoints = MAX_RENDER_POINTS) {
  const list = Array.isArray(points) ? points : [];
  const safeMax = Math.max(2, Math.trunc(Number(maxPoints) || MAX_RENDER_POINTS));
  if (list.length <= safeMax) return list;

  const result = [];
  const lastIndex = list.length - 1;
  const step = lastIndex / (safeMax - 1);

  for (let i = 0; i < safeMax; i += 1) {
    const index = Math.round(i * step);
    result.push(list[Math.min(lastIndex, index)]);
  }

  return result;
}

async function fetchTrendData() {
  const currentRange = rangeMeta.value;
  const { start, end } = currentRange.key === "today"
    ? toTodayIsoWindow()
    : toIsoWindow(currentRange.days);

  const params = {
    level: currentRange.level,
    start_time: start,
    end_time: end,
    limit: DASHBOARD_TREND_CONFIG.snapshotLimit,
  };
  if (selectedAccountId.value) params.account_id = selectedAccountId.value;

  loading.value = true;
  queryError.value = null;
  const reqId = ++requestSeq;

  try {
    const [res, usdPerCurrencyRates] = await Promise.all([
      getAccountSnapshots(params),
      ensureUsdPerCurrencyRates().catch(() => getCachedUsdPerCurrencyRates()),
    ]);

    if (reqId !== requestSeq) return;

    const payload = getPayload(res, {});
    usdPerCnyRate.value = getUsdPerCnyRate(usdPerCurrencyRates);

    const timeline = buildSnapshotTimeline(payload?.meta);
    const axisStart = new Date(String(payload?.meta?.axis_start_time ?? "")).getTime();
    axisStartMs.value = Number.isFinite(axisStart) ? axisStart : 0;
    const intervalSec = Number(payload?.meta?.interval_seconds);
    axisIntervalMs.value = Number.isFinite(intervalSec) && intervalSec > 0 ? intervalSec * 1000 : 0;

    const rawSeries = Array.isArray(payload?.series) ? payload.series : [];

    snapshotSeries.value = rawSeries
      .map((seriesItem) => {
        const id = toPositiveInt(seriesItem?.account_id);
        if (!id) return null;

        const accountCurrency = normalizeCurrency(seriesItem?.account_currency);
        const account = accountById.value.get(id) ?? { currency: accountCurrency };
        const usdPerCurrencyRate = resolveUsdPerCurrencyRate(account, usdPerCurrencyRates);
        const balancesUsd = Array.isArray(seriesItem?.balance_usd) ? seriesItem.balance_usd : [];
        let firstValidIndex = -1;
        let lastValidIndex = -1;
        const data = [];
        const usdData = [];

        timeline.forEach((ts, index) => {
          const usdValue = toSnapshotNumber(balancesUsd[index]);
          if (usdValue === null) return;

          const amount = usdValue / usdPerCurrencyRate;
          if (!Number.isFinite(amount)) return;

          if (firstValidIndex < 0) firstValidIndex = index;
          lastValidIndex = index;
          data.push([ts, amount]);
          usdData.push([ts, usdValue]);
        });

        if (data.length === 0) return null;

        return {
          accountId: id,
          accountName: resolveAccountName(seriesItem),
          accountCurrency,
          firstValidIndex,
          lastValidIndex,
          usdData,
          data,
        };
      })
      .filter(Boolean);
  } catch (e) {
    if (reqId !== requestSeq) return;
    queryError.value = e;
    snapshotSeries.value = [];
    usdPerCnyRate.value = DEFAULT_USD_PER_CURRENCY_RATES.CNY;
    axisStartMs.value = 0;
    axisIntervalMs.value = 0;
  } finally {
    if (reqId === requestSeq) loading.value = false;
  }
}

function startTodayAutoRefresh() {
  if (!AUTO_REFRESH_ENABLED) return;
  if (todayAutoRefreshScheduler) return;

  todayAutoRefreshScheduler = createMinuteAlignedScheduler({
    intervalMinutes: TODAY_AUTO_REFRESH_INTERVAL_MINUTES,
    second: TODAY_AUTO_REFRESH_SECOND,
    task: async () => {
      if (activeRangeKey.value !== "today") return;
      await fetchTrendData();
    },
    onError: () => {
      // Keep scheduler alive even when one refresh fails.
    },
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

const chartSeries = computed(() => {
  if (!snapshotSeries.value.length) return [];

  if (!selectedAccountId.value) {
    const usdTotalsByTs = new Map();

    snapshotSeries.value.forEach((entry) => {
      (entry.usdData || []).forEach(([ts, usdValue]) => {
        const current = usdTotalsByTs.get(ts) ?? 0;
        usdTotalsByTs.set(ts, current + Number(usdValue));
      });
    });

    const cnyRate = Number(usdPerCnyRate.value);
    if (!Number.isFinite(cnyRate) || cnyRate <= 0) return [];

    const data = Array.from(usdTotalsByTs.entries())
      .map(([ts, totalUsd]) => {
        const value = Number(totalUsd) / cnyRate;
        if (!Number.isFinite(value)) return null;
        return [ts, value];
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

    if (data.length === 0) return [];
    const limitedData = limitSeriesPoints(data);

    const singlePoint = limitedData.length === 1;
    const summaryColor = ALL_ACCOUNTS_THEME_COLOR;
    return [{
      id: "account-all-cny",
      name: "全部账户",
      accountId: "all_accounts",
      accountCurrency: "CNY",
      type: "line",
      smooth: true,
      showSymbol: singlePoint,
      symbol: singlePoint ? "circle" : "none",
      symbolSize: singlePoint ? 7 : 4,
      sampling: "lttb",
      itemStyle: { color: summaryColor },
      lineStyle: {
        color: summaryColor,
        width: DASHBOARD_TREND_CONFIG.lineWidth.allAccounts,
      },
      emphasis: { focus: "series" },
      data: limitedData,
    }];
  }

  return snapshotSeries.value.map((entry) => {
    const limitedData = limitSeriesPoints(entry.data);
    const singlePoint = limitedData.length === 1;
    const seriesColor = getAccountColorById(entry.accountId);
    return {
      id: `account-${entry.accountId}`,
      name: entry.accountName,
      accountId: entry.accountId,
      accountCurrency: entry.accountCurrency,
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

const chartSeriesById = computed(() => {
  const map = new Map();
  chartSeries.value.forEach((item) => {
    map.set(String(item.id), item);
  });
  return map;
});

const yAxisCurrency = computed(() => {
  if (!selectedAccountId.value) return "CNY";

  const values = snapshotSeries.value
    .map((item) => item.accountCurrency)
    .filter(Boolean);
  return new Set(values).size === 1 ? values[0] : "";
});

const xAxisBounds = computed(() => {
  if (axisStartMs.value > 0 && axisIntervalMs.value > 0) {
    const ranges = snapshotSeries.value
      .map((item) => [item.firstValidIndex, item.lastValidIndex])
      .filter((item) => item[0] >= 0 && item[1] >= 0);

    if (ranges.length > 0) {
      const minIndex = Math.min(...ranges.map((item) => item[0]));
      const maxIndex = Math.max(...ranges.map((item) => item[1]));
      const min = axisStartMs.value + minIndex * axisIntervalMs.value;
      const max = axisStartMs.value + maxIndex * axisIntervalMs.value;
      if (min === max) {
        const pad = Math.max(axisIntervalMs.value / 2, 60 * 1000);
        return { min: min - pad, max: max + pad };
      }
      return {
        min,
        max,
      };
    }
  }

  const allTimes = chartSeries.value
    .flatMap((item) => item.data.map((point) => new Date(point?.[0]).getTime()))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  if (allTimes.length === 0) return null;
  if (allTimes[0] === allTimes[allTimes.length - 1]) {
    const pad = Math.max(axisIntervalMs.value / 2, 60 * 1000);
    return {
      min: allTimes[0] - pad,
      max: allTimes[0] + pad,
    };
  }
  return {
    min: allTimes[0],
    max: allTimes[allTimes.length - 1],
  };
});

function formatTimelineLabel(ts) {
  const rawMs = new Date(ts).getTime();
  if (!Number.isFinite(rawMs)) return "--";

  const date = new Date(rawMs + 8 * 60 * 60 * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");

  if (activeRangeKey.value === "today") {
    return `${hh}:${mm}`;
  }

  if (activeRangeKey.value === "all" || activeRangeKey.value === "1y") {
    return `${y}-${m}-${d}`;
  }

  if (activeRangeKey.value === "30d") {
    return `${m}-${d}`;
  }

  return `${m}-${d} ${hh}:${mm}`;
}

function formatPlainAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatAxisAmount(value, currencyCode = "") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";

  if (!currencyCode) return formatPlainAmount(n);

  return formatCurrencyAmount(n, currencyCode, {
    symbolOnly: true,
    fallbackWithCode: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatTooltipAmount(value, currencyCode = "") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";

  if (!currencyCode) {
    return new Intl.NumberFormat("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }

  return formatCurrencyAmount(n, currencyCode, {
    symbolOnly: true,
    fallbackWithCode: true,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const chartOption = computed(() => ({
  grid: {
    left: 10,
    right: 12,
    top: 28,
    bottom: 16,
    containLabel: true,
  },
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "line" },
    textStyle: {
      fontFamily: "Times New Roman, Times, serif",
    },
    extraCssText: "font-family:'Times New Roman',Times,serif;",
    formatter: (params) => {
      const rows = Array.isArray(params) ? params : [params];
      if (rows.length === 0) return "--";

      const first = rows[0];
      const ts = String(Array.isArray(first?.value) ? first.value[0] : "");
      const lines = rows.map((item) => {
        const id = String(item?.seriesId ?? "");
        const seriesItem = chartSeriesById.value.get(id);
        const currencyCode = seriesItem?.accountCurrency ?? yAxisCurrency.value;
        const rawValue = Array.isArray(item?.value) ? item.value[1] : item?.value;
        return `${item.marker}${item.seriesName}: ${formatTooltipAmount(rawValue, currencyCode)}`;
      });

      return [formatTimelineLabel(ts), ...lines].join("<br/>");
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
      fontSize: 11,
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
      fontSize: 11,
      hideOverlap: true,
      showMinLabel: true,
      showMaxLabel: true,
      formatter: (value) => formatTimelineLabel(value),
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
      fontSize: 11,
      formatter: (value) => formatAxisAmount(value, yAxisCurrency.value),
    },
    splitLine: { show: false },
  },
  series: chartSeries.value,
}));
</script>

<template>
  <div class="card-base">
    <div class="mb-4 flex flex-col gap-3 sm:mb-5 lg:mb-6">
      <div class="flex items-center justify-between gap-3">
        <h3 class="card-title !px-0 !py-0">账户资产走势</h3>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <button v-for="item in RANGE_OPTIONS" :key="item.key" type="button"
            class="button-base !px-3 !py-1.5 !text-xs sm:!text-sm" :class="activeRangeKey === item.key
              ? '!bg-primary-50 !text-primary-700 !border-primary-200 dark:!bg-[#2c3138] dark:!text-white dark:!border-[#343a42]'
              : ''" @click="activeRangeKey = item.key">
            {{ item.label }}
          </button>
        </div>

        <div class="w-full sm:w-56 sm:shrink-0">
          <SmallAccountPicker v-model="accountId" :accounts="accounts" />
        </div>
      </div>
    </div>

    <div class="flex-1 rounded-xl border border-gray-200 bg-gray-50/70 p-2 dark:border-gray-700 dark:bg-gray-800/40">
      <div v-if="loading" class="h-full min-h-[16rem] grid place-items-center text-sm text-gray-500 dark:text-gray-400">
        正在加载走势数据...
      </div>
      <div v-else-if="queryError"
        class="h-full min-h-[16rem] grid place-items-center text-sm text-red-600 dark:text-red-400">
        走势数据加载失败
      </div>
      <div v-else-if="!hasData"
        class="h-full min-h-[16rem] grid place-items-center text-sm text-gray-500 dark:text-gray-400">
        暂无走势数据
      </div>
      <v-chart v-else class="h-full min-h-[16rem] w-full" :option="chartOption" autoresize />
    </div>
  </div>
</template>

