<script setup>
import { computed, getCurrentInstance, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { ElMessage } from "element-plus";

const props = defineProps({
  position: {
    type: Object,
    default: () => ({}),
  },
});

const safeName = computed(() => props.position?.name ?? "未命名股票");
const safeSymbol = computed(() => String(props.position?.symbol ?? "").trim().toUpperCase());
const safeMarketType = computed(() => String(props.position?.marketType ?? "").trim().toUpperCase());

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
  if (safeSymbol.value) return safeSymbol.value.slice(0, 2);
  return safeName.value.slice(0, 2).toUpperCase();
});

const trendPoints = computed(() => {
  const source = Array.isArray(props.position?.trend) && props.position.trend.length >= 2
    ? props.position.trend
    : [4, 5, 3, 6, 8, 7, 9, 11, 10, 12];

  const min = Math.min(...source);
  const max = Math.max(...source);
  const width = 100;
  const height = 40;
  const pad = 3;
  const range = max - min || 1;

  return source.map((value, index) => {
    const x = (index / (source.length - 1)) * width;
    const y = pad + ((max - value) / range) * (height - pad * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
});

const trendPath = computed(() => {
  if (!trendPoints.value.length) return "";
  return `M ${trendPoints.value.join(" L ")}`;
});

const trendAreaPath = computed(() => {
  if (!trendPoints.value.length) return "";
  const first = trendPoints.value[0].split(",")[0];
  const last = trendPoints.value[trendPoints.value.length - 1].split(",")[0];
  return `M ${first},40 L ${trendPoints.value.join(" L ")} L ${last},40 Z`;
});

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
  if (tone.value === "up") return "#10b981";
  if (tone.value === "down") return "#ef4444";
  return "#9ca3af";
});

const trendFillId = `trend-fill-${getCurrentInstance()?.uid ?? 0}`;
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

let nameResizeObserver = null;

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
    maximumFractionDigits: 2,
  }).format(n)} 股`;
}

function onDetailClick() {
  ElMessage.info("功能开发中");
}

watch(safeName, async () => {
  await nextTick();
  measureNameOverflow();
});

onMounted(async () => {
  await nextTick();
  measureNameOverflow();

  if (typeof ResizeObserver === "undefined" || !nameViewportRef.value) return;
  nameResizeObserver = new ResizeObserver(() => {
    measureNameOverflow();
  });
  nameResizeObserver.observe(nameViewportRef.value);
});

onUnmounted(() => {
  if (!nameResizeObserver) return;
  nameResizeObserver.disconnect();
  nameResizeObserver = null;
});
</script>

<template>
  <article class="card-base min-h-[24rem] gap-3">
    <header class="flex items-center gap-3 min-h-12">
      <div
        class="h-12 w-12 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 dark:border-gray-600 grid place-items-center text-sm font-bold text-gray-700 dark:text-gray-100">
        <img v-if="position?.logoUrl" :src="position.logoUrl" :alt="safeName"
          class="h-full w-full rounded-xl object-cover" />
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
                <span v-if="hasNameOverflow" :class="companyNameClass" class="ml-8" aria-hidden="true">{{ safeName }}</span>
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
        class="min-h-[4.6rem] rounded-xl border border-gray-100 bg-gray-50/80 px-2 py-2 dark:border-gray-700 dark:bg-gray-700/30 flex flex-col items-center justify-center text-center">
        <p class="text-[11px] text-gray-500 dark:text-gray-400">市价</p>
        <p class="mt-1 text-sm font-semibold text-black dark:text-white">{{ currentPriceText }}</p>
        <p v-if="!hasCurrentPrice" class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">待接入</p>
      </div>
      <div
        class="min-h-[4.6rem] rounded-xl border border-gray-100 bg-gray-50/80 px-2 py-2 dark:border-gray-700 dark:bg-gray-700/30 flex flex-col items-center justify-center text-center">
        <p class="text-[11px] text-gray-500 dark:text-gray-400">成本</p>
        <p class="mt-1 text-sm font-semibold text-black dark:text-white">{{ costPriceText }}</p>
      </div>
      <div
        class="min-h-[4.6rem] rounded-xl border border-gray-100 bg-gray-50/80 px-2 py-2 dark:border-gray-700 dark:bg-gray-700/30 flex flex-col items-center justify-center text-center">
        <p class="text-[11px] text-gray-500 dark:text-gray-400">持仓</p>
        <p class="mt-1 text-sm font-semibold text-black dark:text-white">{{ quantityText }}</p>
      </div>
    </div>

    <div
      class="relative flex-1 min-h-[11rem] overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
      <div class="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-3 pt-3">
        <span class="text-xs text-gray-500 dark:text-gray-400">盈亏(今日）</span>
        <span class="text-sm font-semibold" :class="toneTextClass">
          {{ profitValueText }}
        </span>
      </div>

      <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="absolute inset-0 h-full w-full px-3 pb-3 pt-10">
        <defs>
          <linearGradient :id="trendFillId" x1="0" x2="0" y1="0" y2="1">
            <stop :stop-color="trendColor" stop-opacity="0.32" offset="0%" />
            <stop :stop-color="trendColor" stop-opacity="0.02" offset="100%" />
          </linearGradient>
        </defs>

        <path :d="trendAreaPath" :fill="`url(#${trendFillId})`" />
        <path :d="trendPath" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"
          :stroke="trendColor" />
      </svg>
    </div>

    <footer class="grid grid-cols-3 gap-2">
      <button type="button"
        class="button-base !justify-center !rounded-xl !py-2 !text-xs !font-semibold !bg-emerald-50 !text-emerald-700 !border-emerald-100 hover:!bg-emerald-100 dark:!bg-emerald-900/30 dark:!text-emerald-200 dark:!border-emerald-800 dark:hover:!bg-emerald-900/50">
        买入
      </button>
      <button type="button"
        class="button-base !justify-center !rounded-xl !py-2 !text-xs !font-semibold !bg-red-50 !text-red-700 !border-red-100 hover:!bg-red-100 dark:!bg-red-900/30 dark:!text-red-200 dark:!border-red-800 dark:hover:!bg-red-900/50">
        卖出
      </button>
      <button type="button" class="button-base !justify-center !rounded-xl !py-2 !text-xs !font-semibold"
        @click="onDetailClick">
        详情
      </button>
    </footer>
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
</style>
