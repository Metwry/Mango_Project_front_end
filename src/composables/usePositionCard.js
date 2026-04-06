import {
  computed,
  getCurrentInstance,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";
import { useResizeObserver } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { ElMessage } from "@/utils/element";
import { createMinuteAlignedScheduler } from "@/utils/refreshScheduler";
import { buildSnapshotTimeline, getPositionSnapshots } from "@/utils/snapshot";
import { useInvestmentStore } from "@/stores/investment";
import { AUTO_REFRESH_ENABLED, POSITION_TREND_CONFIG } from "@/config/Config";

const TRADE_PANEL_OPEN_EVENT = "investment:trade-panel-open";
const MARKET_MONEY_META = {
  CRYPTO: { prefix: "$", locale: "en-US" },
  FX: { prefix: "", locale: "en-US" },
  CN: { prefix: "¥", locale: "zh-CN" },
  HK: { prefix: "HK$", locale: "zh-HK" },
  US: { prefix: "$", locale: "en-US" },
};
const TREND_AUTO_REFRESH_INTERVAL_MINUTES = POSITION_TREND_CONFIG.autoRefresh.intervalMinutes;
const TREND_AUTO_REFRESH_SECOND = POSITION_TREND_CONFIG.autoRefresh.second;
const companyNameClass = "text-[1rem] font-semibold text-black dark:text-white company-name-font";

function toPositiveInt(value) {
  const n = Number(value);
  return n > 0 ? Math.trunc(n) : null;
}

function limitSeriesPoints(points, maxPoints = POSITION_TREND_CONFIG.maxRenderPoints) {
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

function formatHourTick(value) {
  const date = new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000);
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  if (POSITION_TREND_CONFIG.lookbackDays > 1) return `${mm}-${dd}`;
  return `${hh}:${minute}`;
}

function formatTimeTickWithSeconds(value) {
  const date = new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function usePositionCard(props) {
  const investmentStore = useInvestmentStore();
  const { trading } = storeToRefs(investmentStore);

  const tradeMode = ref("");
  const tradePanelVisible = ref(false);
  const tradeTransitionName = ref("trade-panel-drawer");
  const logoLoadFailed = ref(false);
  const isDarkMode = ref(false);
  const trendLoading = ref(false);
  const trendFetchError = ref(null);
  const trendSeries = ref([]);
  const trendAxisStartMs = ref(0);
  const trendAxisIntervalMs = ref(0);
  const trendStartIndex = ref(-1);
  const trendEndIndex = ref(-1);
  const nameViewportRef = ref(null);
  const nameMeasureRef = ref(null);
  const nameOverflow = ref(0);
  let trendRequestSeq = 0;
  let trendAutoRefreshScheduler = null;
  let themeObserver = null;

  const safeName = computed(() => props.position.name || "未命名股票");
  const safeSymbol = computed(() => String(props.position.shortCode || "").trim().toUpperCase());
  const safeMarketType = computed(() => String(props.position.marketType || "CN").trim().toUpperCase());
  const safeCostPrice = computed(() => Number(props.position.costPrice || 0));
  const safeQuantity = computed(() => Number(props.position.quantity || 0));
  const safeCurrentPrice = computed(() => (
    props.position.currentPrice == null ? null : Number(props.position.currentPrice)
  ));
  const hasCurrentPrice = computed(() => safeCurrentPrice.value !== null);

  const marketValue = computed(() => (
    hasCurrentPrice.value ? safeCurrentPrice.value * safeQuantity.value : null
  ));
  const costValue = computed(() => safeCostPrice.value * safeQuantity.value);
  const profitValue = computed(() => (
    marketValue.value === null ? null : marketValue.value - costValue.value
  ));
  const profitPercent = computed(() => (
    profitValue.value === null || costValue.value === 0
      ? null
      : (profitValue.value / costValue.value) * 100
  ));

  const tradePanelKey = computed(() => {
    const instrumentId = Number(props.position.instrumentId);
    if (instrumentId > 0) return `instrument:${Math.trunc(instrumentId)}`;
    return `uid:${getCurrentInstance()?.uid ?? "0"}`;
  });

  const logoText = computed(() => (
    props.position.logoText || safeName.value.slice(0, 2).toUpperCase() || safeSymbol.value.slice(0, 2) || "--"
  ));

  const logoUrl = computed(() => {
    const rawUrl = String(props.position.logoUrl || "").trim();
    if (!rawUrl) return "";

    try {
      const url = new URL(rawUrl);
      if (!/(\.|^)logo\.dev$/i.test(url.hostname)) return rawUrl;
      url.searchParams.set("format", "png");
      url.searchParams.set("theme", isDarkMode.value ? "dark" : "light");
      return url.toString();
    } catch {
      return rawUrl;
    }
  });

  const showLogoImage = computed(() => !!logoUrl.value && !logoLoadFailed.value);
  const accentColor = computed(() => String(props.position.logoColor || "").trim().toUpperCase());
  const cardThemeStyle = computed(() => (
    accentColor.value ? { borderColor: `${accentColor.value}61` } : {}
  ));
  const statBorderStyle = computed(() => (
    accentColor.value ? { borderColor: `${accentColor.value}4D` } : {}
  ));

  const instrumentId = computed(() => toPositiveInt(props.position.instrumentId));
  const snapshotAccountId = computed(() => toPositiveInt(
    props.position.accountId ?? props.investmentAccountId,
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
    if (accentColor.value) return accentColor.value;
    if (tone.value === "up") return "#10b981";
    if (tone.value === "down") return "#ef4444";
    return "#9ca3af";
  });

  const hasTrendData = computed(() => trendSeries.value.length > 0);
  const chartAxisTextColor = computed(() => (isDarkMode.value ? "#ffffff" : "#111827"));
  const hasNameOverflow = computed(() => nameOverflow.value > 2);
  const nameTrackStyle = computed(() => {
    if (!hasNameOverflow.value) return {};
    const duration = Math.max(7, Number((nameOverflow.value / 22).toFixed(1)));
    return {
      "--name-shift": `-${nameOverflow.value}px`,
      "--name-duration": `${duration}s`,
    };
  });

  function formatMoney(value) {
    const meta = MARKET_MONEY_META[safeMarketType.value] ?? MARKET_MONEY_META.CN;
    const absText = new Intl.NumberFormat(meta.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(Number(value)));

    if (!meta.prefix) return Number(value) < 0 ? `-${absText}` : absText;
    return Number(value) < 0 ? `-${meta.prefix}${absText}` : `${meta.prefix}${absText}`;
  }

  function formatQuantity(value) {
    return new Intl.NumberFormat("zh-CN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    }).format(Number(value));
  }

  function measureNameOverflow() {
    if (!nameViewportRef.value || !nameMeasureRef.value) {
      nameOverflow.value = 0;
      return;
    }

    const overflow = nameMeasureRef.value.scrollWidth - nameViewportRef.value.clientWidth;
    nameOverflow.value = overflow > 0 ? overflow : 0;
  }

  async function fetchPositionTrend() {
    if (!snapshotAccountId.value || !instrumentId.value) {
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
    const start = new Date(end.getTime() - POSITION_TREND_CONFIG.lookbackDays * 24 * 60 * 60 * 1000);
    const params = {
      level: POSITION_TREND_CONFIG.level,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      account_id: snapshotAccountId.value,
      instrument_id: instrumentId.value,
      limit: POSITION_TREND_CONFIG.snapshotLimit,
    };

    trendLoading.value = true;
    trendFetchError.value = null;
    const reqId = ++trendRequestSeq;

    try {
      const { data } = await getPositionSnapshots(params);
      if (reqId !== trendRequestSeq) return;

      const timeline = buildSnapshotTimeline(data.meta);
      const targetSeries = data.series.find((item) => item.instrument_id === instrumentId.value);

      trendAxisStartMs.value = new Date(data.meta.axis_start_time).getTime();
      trendAxisIntervalMs.value = Number(data.meta.interval_seconds) * 1000;

      let firstValidIndex = -1;
      let lastValidIndex = -1;

      const rawSeries = timeline.flatMap((ts, index) => {
        const rawValue = targetSeries?.market_value[index];
        if (rawValue === null || rawValue === undefined) return [];

        if (firstValidIndex < 0) firstValidIndex = index;
        lastValidIndex = index;
        return [[ts, Number(rawValue)]];
      });

      trendSeries.value = limitSeriesPoints(rawSeries);
      trendStartIndex.value = firstValidIndex;
      trendEndIndex.value = lastValidIndex;
    } catch (error) {
      if (reqId !== trendRequestSeq) return;
      trendFetchError.value = error;
      trendSeries.value = [];
      trendAxisStartMs.value = 0;
      trendAxisIntervalMs.value = 0;
      trendStartIndex.value = -1;
      trendEndIndex.value = -1;
    } finally {
      if (reqId === trendRequestSeq) trendLoading.value = false;
    }
  }

  function startTrendAutoRefresh() {
    if (!AUTO_REFRESH_ENABLED || trendAutoRefreshScheduler) return;

    trendAutoRefreshScheduler = createMinuteAlignedScheduler({
      intervalMinutes: TREND_AUTO_REFRESH_INTERVAL_MINUTES,
      second: TREND_AUTO_REFRESH_SECOND,
      task: fetchPositionTrend,
      onError: () => {},
    });

    trendAutoRefreshScheduler.start();
  }

  function stopTrendAutoRefresh() {
    if (!trendAutoRefreshScheduler) return;
    trendAutoRefreshScheduler.stop();
    trendAutoRefreshScheduler = null;
  }

  function syncThemeState() {
    if (typeof document === "undefined") return;
    isDarkMode.value = document.documentElement.classList.contains("dark");
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
    if (!targetKey || targetKey === tradePanelKey.value || !tradePanelVisible.value) return;
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
    try {
      if (payload.mode === "buy") {
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
        return { min: min - pad, max: max + pad };
      }
      return { min, max };
    }

    if (!trendSeries.value.length) return null;
    const values = trendSeries.value.map((item) => new Date(item[0]).getTime()).sort((a, b) => a - b);
    if (values[0] === values[values.length - 1]) {
      const pad = Math.max(trendAxisIntervalMs.value / 2, 60 * 1000);
      return { min: values[0] - pad, max: values[0] + pad };
    }
    return { min: values[0], max: values[values.length - 1] };
  });

  const trendBounds = computed(() => {
    if (!trendSeries.value.length) return null;
    const values = trendSeries.value.map((item) => item[1]);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  });

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
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
      },
      formatter: (params) => {
        const first = Array.isArray(params) ? params[0] : params;
        const timeText = formatTimeTickWithSeconds(first.axisValue ?? first.value[0]);
        const valueText = formatMoney(Array.isArray(first.value) ? first.value[1] : first.value);

        return `
          <div style="font-family:'PingFang SC','Microsoft YaHei',sans-serif;">
            <div style="margin-bottom:6px;">${timeText}</div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="width:12px;height:12px;border-radius:999px;background:${trendColor.value};display:inline-block;"></span>
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
        color: chartAxisTextColor.value,
        fontSize: 11,
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
        hideOverlap: true,
        showMinLabel: true,
        showMaxLabel: true,
        formatter: formatHourTick,
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

  const costPriceText = computed(() => formatMoney(safeCostPrice.value));
  const quantityText = computed(() => formatQuantity(safeQuantity.value));
  const currentPriceText = computed(() => (
    hasCurrentPrice.value ? formatMoney(safeCurrentPrice.value) : "--"
  ));
  const profitValueText = computed(() => (
    profitValue.value === null ? "--" : formatMoney(profitValue.value)
  ));
  const profitPercentText = computed(() => (
    profitPercent.value === null ? "--" : `${profitPercent.value >= 0 ? "+" : ""}${profitPercent.value.toFixed(2)}%`
  ));
  const trendHeaderLabel = computed(() => POSITION_TREND_CONFIG.headerLabel);

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
    startTrendAutoRefresh();
    syncThemeState();

    if (typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
      themeObserver = new MutationObserver(syncThemeState);
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    if (typeof window !== "undefined") {
      window.addEventListener(TRADE_PANEL_OPEN_EVENT, onExternalTradePanelOpen);
    }
  });

  onUnmounted(() => {
    trendRequestSeq += 1;
    stopTrendAutoRefresh();
    if (themeObserver) themeObserver.disconnect();
    if (typeof window !== "undefined") {
      window.removeEventListener(TRADE_PANEL_OPEN_EVENT, onExternalTradePanelOpen);
    }
  });

  return {
    trading,
    tradeMode,
    tradePanelVisible,
    tradeTransitionName,
    logoLoadFailed,
    trendLoading,
    trendFetchError,
    safeName,
    safeSymbol,
    safeCostPrice,
    safeQuantity,
    hasCurrentPrice,
    showLogoImage,
    logoText,
    logoUrl,
    cardThemeStyle,
    statBorderStyle,
    badgeClass,
    toneTextClass,
    hasTrendData,
    trendOption,
    companyNameClass,
    nameViewportRef,
    nameMeasureRef,
    hasNameOverflow,
    nameTrackStyle,
    costPriceText,
    quantityText,
    currentPriceText,
    profitValueText,
    profitPercentText,
    trendHeaderLabel,
    openTradePanel,
    closeTradePanel,
    onTradeSubmit,
    onDetailClick,
  };
}
