<script setup>
import { computed, getCurrentInstance, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import VChart from "vue-echarts";
import { useResizeObserver } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { ElMessage } from "element-plus";
import TradePositionPanel from "@/components/windows/TradePositionPanel.vue";
import { getPayload } from "@/utils/api";
import { buildSnapshotTimeline, getPositionSnapshots } from "@/utils/snapshot";
import { useInvestmentStore } from "@/stores/investment";

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent]);

const props = defineProps({
  position: {
    type: Object,
    default: () => ({}),
  },
  accounts: {
    type: Array,
    default: () => [],
  },
  investmentAccountId: {
    type: [Number, String],
    default: "",
  },
});

const safeName = computed(() => props.position?.name ?? "未命名股票");
const safeSymbol = computed(() => String(props.position?.symbol ?? "").trim().toUpperCase());
const safeMarketType = computed(() => String(props.position?.marketType ?? "").trim().toUpperCase());
const investmentStore = useInvestmentStore();
const { trading } = storeToRefs(investmentStore);

const TRADE_PANEL_OPEN_EVENT = "investment:trade-panel-open";
const tradePanelKey = computed(() => {
  const instrumentId = Number(props.position?.instrumentId ?? props.position?.instrument_id);
  if (Number.isFinite(instrumentId) && instrumentId > 0) {
    return `instrument:${Math.trunc(instrumentId)}`;
  }

  const symbol = String(props.position?.symbol ?? props.position?.shortCode ?? "")
    .trim()
    .toUpperCase();
  return symbol ? `symbol:${symbol}` : `uid:${getCurrentInstance()?.uid ?? "0"}`;
});

const tradeMode = ref("");
const tradePanelVisible = ref(false);
const tradeTransitionName = ref("trade-panel-drawer");
const logoLoadFailed = ref(false);
const trendLoading = ref(false);
const trendFetchError = ref(null);
const trendSeries = ref([]);
const trendAxisStartMs = ref(0);
const trendAxisIntervalMs = ref(0);
const trendStartIndex = ref(-1);
const trendEndIndex = ref(-1);
let trendRequestSeq = 0;

const MARKET_MONEY_META = {
  CRYPTO: { prefix: "$", locale: "en-US" },
  FX: { prefix: "", locale: "en-US" },
  CN: { prefix: "¥", locale: "zh-CN" },
  HK: { prefix: "HK$", locale: "zh-HK" },
  US: { prefix: "$", locale: "en-US" },
};

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toNullableNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const safeCostPrice = computed(() => toNumber(props.position?.costPrice, 0));
const safeQuantity = computed(() => toNumber(props.position?.quantity, 0));
const safeCurrentPrice = computed(() => toNullableNumber(props.position?.currentPrice));
const hasCurrentPrice = computed(() => safeCurrentPrice.value !== null);

const marketValue = computed(() => {
  if (!hasCurrentPrice.value) return null;
  return safeCurrentPrice.value * safeQuantity.value;
});
const costValue = computed(() => safeCostPrice.value * safeQuantity.value);
const profitValue = computed(() => {
  if (marketValue.value === null) return null;
  return marketValue.value - costValue.value;
});
const profitPercent = computed(() => {
  if (profitValue.value === null || !costValue.value) return null;
  return (profitValue.value / costValue.value) * 100;
});

const logoText = computed(() => {
  if (props.position?.logoText) return props.position.logoText.slice(0, 2).toUpperCase();
  const companyText = String(safeName.value || "").trim();
  if (companyText) return companyText.slice(0, 2).toUpperCase();
  if (safeSymbol.value) return safeSymbol.value.slice(0, 2);
  return "--";
});
const logoUrl = computed(() => String(props.position?.logoUrl ?? "").trim());
const showLogoImage = computed(() => !!logoUrl.value && !logoLoadFailed.value);

function hexToRgb(hex) {
  const normalized = String(hex ?? "").trim().toUpperCase();
  const m = /^#([0-9A-F]{6})$/.exec(normalized);
  if (!m) return null;
  const raw = m[1];
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

const cardThemeStyle = computed(() => {
  const rgb = hexToRgb(props.position?.logoColor);
  if (!rgb) return null;
  const { r, g, b } = rgb;
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.2)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.35)`,
  };
});

const statThemeStyle = computed(() => {
  const rgb = hexToRgb(props.position?.logoColor);
  if (!rgb) return null;
  const { r, g, b } = rgb;
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.05)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.36)`,
  };
});

function toPositiveInt(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function toSnapshotNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const instrumentId = computed(() => toPositiveInt(
  props.position?.instrumentId ?? props.position?.instrument_id,
));
const snapshotAccountId = computed(() => toPositiveInt(
  props.position?.accountId ??
  props.position?.account_id ??
  props.investmentAccountId,
));

const tone = computed(() => {
  if (profitValue.value === null) return "neutral";
  return profitValue.value >= 0 ? "up" : "down";
});

const badgeClass = computed(() => {
  if (tone.value === "up") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  }
  if (tone.value === "down") {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  }
  return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
});

const toneTextClass = computed(() => {
  if (tone.value === "up") return "text-emerald-600 dark:text-emerald-300";
  if (tone.value === "down") return "text-red-600 dark:text-red-300";
  return "text-gray-500 dark:text-gray-300";
});

const trendColor = computed(() => {
  const themeColor = String(props.position?.logoColor ?? "").trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(themeColor)) return themeColor;

  if (tone.value === "up") return "#10b981";
  if (tone.value === "down") return "#ef4444";
  return "#9ca3af";
});

const hasTrendData = computed(() => trendSeries.value.length > 0);

const trendTimeBounds = computed(() => {
  if (
    trendAxisStartMs.value > 0 &&
    trendAxisIntervalMs.value > 0 &&
    trendStartIndex.value >= 0 &&
    trendEndIndex.value >= 0
  ) {
    const min = trendAxisStartMs.value + trendStartIndex.value * trendAxisIntervalMs.value;
    const max = trendAxisStartMs.value + trendEndIndex.value * trendAxisIntervalMs.value;
    if (min === max) {
      const pad = Math.max(trendAxisIntervalMs.value / 2, 60 * 1000);
      return {
        min: min - pad,
        max: max + pad,
      };
    }
    return {
      min,
      max,
    };
  }

  const values = trendSeries.value
    .map((item) => new Date(item?.[0]).getTime())
    .filter((item) => Number.isFinite(item))
    .sort((a, b) => a - b);

  if (values.length === 0) return null;
  if (values[0] === values[values.length - 1]) {
    const pad = Math.max(trendAxisIntervalMs.value / 2, 60 * 1000);
    return {
      min: values[0] - pad,
      max: values[0] + pad,
    };
  }
  return {
    min: values[0],
    max: values[values.length - 1],
  };
});

const trendBounds = computed(() => {
  const values = trendSeries.value
    .map((item) => Number(item?.[1]))
    .filter((item) => Number.isFinite(item));

  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, max };
});

function formatHourTick(value) {
  const rawMs = new Date(value).getTime();
  if (!Number.isFinite(rawMs)) return "--";
  const date = new Date(rawMs + 8 * 60 * 60 * 1000);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatTimeTickWithSeconds(value) {
  const rawMs = new Date(value).getTime();
  if (!Number.isFinite(rawMs)) return "--:--:--";
  const date = new Date(rawMs + 8 * 60 * 60 * 1000);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function formatTrendValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

const trendOption = computed(() => ({
  animationDuration: 420,
  grid: {
    left: 8,
    right: 8,
    top: 14,
    bottom: 8,
    containLabel: true,
  },
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "line" },
    textStyle: {
      color: "#374151",
      fontFamily: "Times New Roman, Times, serif",
    },
    formatter: (params) => {
      const first = Array.isArray(params) ? params[0] : params;
      const timeText = formatTimeTickWithSeconds(
        first?.axisValue ?? first?.value?.[0] ?? first?.data?.[0],
      );
      const rawValue = Array.isArray(first?.value) ? first.value[1] : first?.value;
      const valueText = formatMoney(rawValue);
      const markerColor = trendColor.value;

      return `
        <div style="font-family:'Times New Roman',Times,serif;">
          <div style="margin-bottom:6px;">${timeText}</div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:12px;height:12px;border-radius:999px;background:${markerColor};display:inline-block;"></span>
            <span style="font-size:15px;font-weight:600;line-height:1.1;">${valueText}</span>
          </div>
        </div>
      `;
    },
  },
  xAxis: {
    type: "time",
    min: trendTimeBounds.value?.min,
    max: trendTimeBounds.value?.max,
    boundaryGap: false,
    axisLine: { lineStyle: { color: "rgba(148,163,184,0.35)" } },
    axisTick: { show: false },
    axisLabel: {
      color: "#94a3b8",
      fontSize: 10,
      fontFamily: "Times New Roman, Times, serif",
      hideOverlap: true,
      showMinLabel: true,
      showMaxLabel: true,
      formatter: (value) => formatHourTick(value),
    },
  },
  yAxis: {
    type: "value",
    min: trendBounds.value?.min,
    max: trendBounds.value?.max,
    scale: true,
    show: false,
  },
  series: [
    {
      type: "line",
      smooth: true,
      showSymbol: trendSeries.value.length === 1,
      symbol: trendSeries.value.length === 1 ? "circle" : "none",
      symbolSize: trendSeries.value.length === 1 ? 7 : 4,
      sampling: "lttb",
      itemStyle: {
        color: trendColor.value,
        borderColor: trendColor.value,
        opacity: 1,
      },
      lineStyle: {
        color: trendColor.value,
        width: 2.1,
        opacity: 1,
      },
      areaStyle: {
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: `${trendColor.value}55` },
            { offset: 1, color: `${trendColor.value}08` },
          ],
        },
      },
      emphasis: {
        disabled: true,
      },
      data: trendSeries.value,
    },
  ],
}));

const companyNameClass = "text-base font-semibold text-black dark:text-white company-name-font";

const nameViewportRef = ref(null);
const nameMeasureRef = ref(null);
const nameOverflow = ref(0);
const hasNameOverflow = computed(() => nameOverflow.value > 2);
const nameTrackStyle = computed(() => {
  if (!hasNameOverflow.value) return {};
  const duration = Math.max(7, Number((nameOverflow.value / 22).toFixed(1)));
  return {
    "--name-shift": `-${nameOverflow.value}px`,
    "--name-duration": `${duration}s`,
  };
});

function measureNameOverflow() {
  const viewport = nameViewportRef.value;
  const measure = nameMeasureRef.value;
  if (!viewport || !measure) {
    nameOverflow.value = 0;
    return;
  }

  const overflow = measure.scrollWidth - viewport.clientWidth;
  nameOverflow.value = overflow > 0 ? overflow : 0;
}

const costPriceText = computed(() => formatMoney(safeCostPrice.value));
const quantityText = computed(() => formatQuantity(safeQuantity.value));
const currentPriceText = computed(() => {
  if (!hasCurrentPrice.value) return "--";
  return formatMoney(safeCurrentPrice.value);
});
const profitValueText = computed(() => {
  if (profitValue.value === null) return "--";
  return formatMoney(profitValue.value);
});
const profitPercentText = computed(() => {
  if (profitPercent.value === null) return "--";
  return `${profitPercent.value >= 0 ? "+" : ""}${profitPercent.value.toFixed(2)}%`;
});

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";
  const meta = MARKET_MONEY_META[safeMarketType.value] ?? MARKET_MONEY_META.CN;
  const absText = new Intl.NumberFormat(meta.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));

  if (!meta.prefix) return n < 0 ? `-${absText}` : absText;
  return n < 0 ? `-${meta.prefix}${absText}` : `${meta.prefix}${absText}`;
}

function formatQuantity(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";
  return `${new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  }).format(n)}`;
}

async function fetchPositionTrend() {
  const accountId = snapshotAccountId.value;
  const targetInstrumentId = instrumentId.value;

  if (!accountId || !targetInstrumentId) {
    trendSeries.value = [];
    trendFetchError.value = null;
    trendLoading.value = false;
    trendAxisStartMs.value = 0;
    trendAxisIntervalMs.value = 0;
    trendStartIndex.value = -1;
    trendEndIndex.value = -1;
    return;
  }

  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const params = {
    level: "M15",
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    account_id: accountId,
    instrument_id: targetInstrumentId,
    limit: 10000,
  };

  trendLoading.value = true;
  trendFetchError.value = null;
  const reqId = ++trendRequestSeq;

  try {
    const res = await getPositionSnapshots(params);
    if (reqId !== trendRequestSeq) return;

    const payload = getPayload(res, {});
    const timeline = buildSnapshotTimeline(payload?.meta);
    const axisStart = new Date(String(payload?.meta?.axis_start_time ?? "")).getTime();
    trendAxisStartMs.value = Number.isFinite(axisStart) ? axisStart : 0;
    const intervalSec = Number(payload?.meta?.interval_seconds);
    trendAxisIntervalMs.value = Number.isFinite(intervalSec) && intervalSec > 0 ? intervalSec * 1000 : 0;

    const series = Array.isArray(payload?.series) ? payload.series : [];
    const targetSeries = series.find((item) => toPositiveInt(item?.instrument_id) === targetInstrumentId) ?? null;
    const valueList = Array.isArray(targetSeries?.market_value) ? targetSeries.market_value : [];

    let firstValidIndex = -1;
    let lastValidIndex = -1;

    trendSeries.value = timeline.reduce((acc, ts, index) => {
      const trendValue = toSnapshotNumber(valueList[index]);
      if (trendValue === null) return acc;

      if (firstValidIndex < 0) firstValidIndex = index;
      lastValidIndex = index;
      acc.push([ts, trendValue]);
      return acc;
    }, []);

    trendStartIndex.value = firstValidIndex;
    trendEndIndex.value = lastValidIndex;
  } catch (e) {
    if (reqId !== trendRequestSeq) return;
    trendFetchError.value = e;
    trendSeries.value = [];
    trendAxisStartMs.value = 0;
    trendAxisIntervalMs.value = 0;
    trendStartIndex.value = -1;
    trendEndIndex.value = -1;
  } finally {
    if (reqId === trendRequestSeq) trendLoading.value = false;
  }
}

function notifyTradePanelOpen(mode) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TRADE_PANEL_OPEN_EVENT, {
    detail: {
      panelKey: tradePanelKey.value,
      mode,
    },
  }));
}

function onExternalTradePanelOpen(event) {
  const targetKey = String(event?.detail?.panelKey ?? "");
  if (!targetKey || targetKey === tradePanelKey.value) return;
  if (!tradePanelVisible.value) return;
  tradeTransitionName.value = "trade-panel-drawer";
  tradePanelVisible.value = false;
  tradeMode.value = "";
}

function openTradePanel(mode) {
  if (tradePanelVisible.value && tradeMode.value === mode) {
    closeTradePanel();
    return;
  }

  if (tradePanelVisible.value && tradeMode.value && tradeMode.value !== mode) {
    tradeTransitionName.value = mode === "sell" ? "trade-panel-switch-left" : "trade-panel-switch-right";
    tradeMode.value = mode;
    notifyTradePanelOpen(mode);
    return;
  }

  tradeTransitionName.value = "trade-panel-drawer";
  tradeMode.value = mode;
  tradePanelVisible.value = true;
  notifyTradePanelOpen(mode);
}

function closeTradePanel() {
  tradeTransitionName.value = "trade-panel-drawer";
  tradePanelVisible.value = false;
  tradeMode.value = "";
}

async function onTradeSubmit(payload) {
  const mode = String(payload?.mode ?? "");
  if (!mode) return;

  try {
    if (mode === "buy") {
      await investmentStore.buyPosition(payload);
      ElMessage.success("买入成功");
    } else {
      await investmentStore.sellPosition(payload);
      ElMessage.success("卖出成功");
    }
    closeTradePanel();
  } catch {
    // API interceptor already gives detailed error messages.
  }
}

function onDetailClick() {
  ElMessage.info("功能开发中");
}

watch([safeName, nameViewportRef, nameMeasureRef], async () => {
  await nextTick();
  measureNameOverflow();
}, { immediate: true });

watch(logoUrl, () => {
  logoLoadFailed.value = false;
}, { immediate: true });

watch([snapshotAccountId, instrumentId], () => {
  void fetchPositionTrend();
}, { immediate: true });

useResizeObserver(nameViewportRef, () => {
  measureNameOverflow();
});

onMounted(() => {
  if (typeof window === "undefined") return;
  window.addEventListener(TRADE_PANEL_OPEN_EVENT, onExternalTradePanelOpen);
});

onUnmounted(() => {
  trendRequestSeq += 1;
  if (typeof window === "undefined") return;
  window.removeEventListener(TRADE_PANEL_OPEN_EVENT, onExternalTradePanelOpen);
});
</script>

<template>
  <article
    class="card-base min-h-[24rem] gap-3 transition-all duration-200 ease-linear hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] dark:hover:shadow-[0_10px_24px_rgba(0,0,0,0.3)]"
    :style="cardThemeStyle">
    <header class="flex items-center gap-3 min-h-12">
      <div class="h-12 w-12 rounded-xl grid place-items-center text-sm font-bold text-gray-700 dark:text-gray-100">
        <img v-if="showLogoImage" :src="logoUrl" :alt="safeName" loading="lazy" decoding="async"
          @error="logoLoadFailed = true" class="h-full w-full rounded-xl object-cover" />
        <span v-else>{{ logoText }}</span>
      </div>

      <div class="min-w-0 flex-1 flex items-center">
        <div class="min-w-0">
          <div ref="nameViewportRef" class="relative overflow-hidden">
            <span ref="nameMeasureRef"
              class="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap font-semibold"
              :class="companyNameClass">
              {{ safeName }}
            </span>
            <h3 class="font-semibold leading-none">
              <span class="inline-flex whitespace-nowrap min-w-full name-marquee-track"
                :class="hasNameOverflow ? 'name-marquee-animated' : ''" :style="nameTrackStyle">
                <span :class="companyNameClass">{{ safeName }}</span>
                <span v-if="hasNameOverflow" :class="companyNameClass" class="ml-8" aria-hidden="true">{{ safeName
                }}</span>
              </span>
            </h3>
          </div>
          <p v-if="safeSymbol" class="mt-1 text-[11px] text-gray-500 dark:text-gray-400 font-mono">{{ safeSymbol }}</p>
        </div>
      </div>

      <span class="rounded-full px-2 py-1 text-xs font-semibold" :class="badgeClass">
        {{ profitPercentText }}
      </span>
    </header>

    <div class="grid grid-cols-3 gap-2">
      <div
        class="min-h-[4.6rem] rounded-xl  border-2 border-gray-100 bg-gray-50/80 px-2 py-2 dark:border-gray-700 dark:bg-gray-700/30 flex flex-col items-center justify-center text-center"
        :style="statThemeStyle">
        <p class="text-[11px] text-gray-500 dark:text-gray-400">市场价</p>
        <p class="mt-1 text-sm font-semibold text-black dark:text-white">{{ currentPriceText }}</p>
        <p v-if="!hasCurrentPrice" class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">待接入</p>
      </div>
      <div
        class="min-h-[4.6rem] rounded-xl  border-2 border-gray-100 bg-gray-50/80 px-2 py-2 dark:border-gray-700 dark:bg-gray-700/30 flex flex-col items-center justify-center text-center"
        :style="statThemeStyle">
        <p class="text-[11px] text-gray-500 dark:text-gray-400">成本价</p>
        <p class="mt-1 text-sm font-semibold text-black dark:text-white">{{ costPriceText }}</p>
      </div>
      <div
        class="min-h-[4.6rem] rounded-xl  border-2 border-gray-100 bg-gray-50/80 px-2 py-2 dark:border-gray-700 dark:bg-gray-700/30 flex flex-col items-center justify-center text-center"
        :style="statThemeStyle">
        <p class="text-[11px] text-gray-500 dark:text-gray-400">持仓数量</p>
        <p class="mt-1 text-sm font-semibold text-black dark:text-white">{{ quantityText }}</p>
      </div>
    </div>

    <div
      class="relative flex-1 min-h-[11rem] overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
      <div class="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-3 pt-3">
        <span class="text-xs text-gray-500 dark:text-gray-400">今日走势</span>
        <span class="text-sm font-semibold" :class="toneTextClass">
          {{ profitValueText }}
        </span>
      </div>

      <div class="absolute inset-0 px-2 pb-2 pt-10">
        <div v-if="trendLoading" class="h-full w-full grid place-items-center text-xs text-gray-400 dark:text-gray-500">
          加载走势中...
        </div>
        <div v-else-if="!hasTrendData && trendFetchError"
          class="h-full w-full grid place-items-center text-xs text-red-500 dark:text-red-400">
          走势加载失败
        </div>
        <v-chart v-else-if="hasTrendData" class="h-full w-full" :option="trendOption" autoresize />
        <div v-else class="h-full w-full grid place-items-center text-xs text-gray-400 dark:text-gray-500">
          暂无走势数据
        </div>
      </div>
    </div>

    <div class="relative">
      <Transition :name="tradeTransitionName" mode="out-in">
        <TradePositionPanel v-if="tradePanelVisible && tradeMode" :key="tradeMode"
          class="absolute bottom-[calc(100%+10px)] left-1 right-1 z-20" :visible="tradePanelVisible" :mode="tradeMode"
          :position="position" :accounts="accounts" :submitting="trading" @close="closeTradePanel"
          @submit="onTradeSubmit" />
      </Transition>

      <footer class="grid grid-cols-3 gap-2">
        <button type="button" data-trade-trigger="true"
          class="button-base !justify-center !rounded-xl !py-2 !text-xs !font-semibold !bg-emerald-50 !text-emerald-700 !border-emerald-100 hover:!bg-emerald-100 dark:!bg-emerald-900/30 dark:!text-emerald-200 dark:!border-emerald-800 dark:hover:!bg-emerald-900/50"
          :disabled="trading" @click="openTradePanel('buy')">
          买入
        </button>
        <button type="button" data-trade-trigger="true"
          class="button-base !justify-center !rounded-xl !py-2 !text-xs !font-semibold !bg-red-50 !text-red-700 !border-red-100 hover:!bg-red-100 dark:!bg-red-900/30 dark:!text-red-200 dark:!border-red-800 dark:hover:!bg-red-900/50"
          :disabled="trading" @click="openTradePanel('sell')">
          卖出
        </button>
        <button type="button" class="button-base !justify-center !rounded-xl !py-2 !text-xs !font-semibold"
          @click="onDetailClick">
          详情
        </button>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.name-marquee-track {
  will-change: transform;
}

.name-marquee-animated {
  animation: name-marquee var(--name-duration, 8s) ease-in-out infinite;
}

.company-name-font {
  font-family: "SimHei", "Heiti SC", "Microsoft YaHei", sans-serif;
}

@keyframes name-marquee {

  0%,
  12% {
    transform: translateX(0);
  }

  50%,
  62% {
    transform: translateX(var(--name-shift, 0px));
  }

  100% {
    transform: translateX(0);
  }
}

.trade-panel-drawer-enter-active,
.trade-panel-drawer-leave-active {
  transition: opacity 0.24s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: opacity, transform;
  transform-origin: 50% 100%;
}

.trade-panel-drawer-enter-from {
  opacity: 0;
  transform: scaleY(0.06);
}

.trade-panel-drawer-enter-to,
.trade-panel-drawer-leave-from {
  opacity: 1;
  transform: scaleY(1);
}

.trade-panel-drawer-leave-to {
  opacity: 0;
  transform: scaleY(0.06);
}

.trade-panel-switch-left-enter-active,
.trade-panel-switch-left-leave-active,
.trade-panel-switch-right-enter-active,
.trade-panel-switch-right-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
  will-change: opacity, transform;
}

.trade-panel-switch-left-enter-from {
  opacity: 0;
  transform: translateX(16px);
}

.trade-panel-switch-left-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

.trade-panel-switch-right-enter-from {
  opacity: 0;
  transform: translateX(-16px);
}

.trade-panel-switch-right-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>
