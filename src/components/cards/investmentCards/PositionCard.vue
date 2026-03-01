<script setup>
import { computed, getCurrentInstance } from "vue";
import { ElMessage } from "element-plus";

const props = defineProps({
  position: {
    type: Object,
    default: () => ({}),
  },
});

const safeName = computed(() => props.position?.name ?? "未命名股票");
const safeCostPrice = computed(() => Number(props.position?.costPrice ?? 0));
const safeCurrentPrice = computed(() => Number(props.position?.currentPrice ?? 0));
const safeQuantity = computed(() => Number(props.position?.quantity ?? 0));

const marketValue = computed(() => safeCurrentPrice.value * safeQuantity.value);
const costValue = computed(() => safeCostPrice.value * safeQuantity.value);
const profitValue = computed(() => marketValue.value - costValue.value);
const profitPercent = computed(() => {
  if (!costValue.value) return 0;
  return (profitValue.value / costValue.value) * 100;
});

const logoText = computed(() => {
  if (props.position?.logoText) return props.position.logoText.slice(0, 2).toUpperCase();
  if (props.position?.symbol) return props.position.symbol.slice(0, 2).toUpperCase();
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

const isProfit = computed(() => profitValue.value >= 0);
const trendFillId = `trend-fill-${getCurrentInstance()?.uid ?? 0}`;
const safeNameLength = computed(() => Array.from(safeName.value).length);
const nameClass = computed(() => (safeNameLength.value <= 10 ? "text-[1.1rem]" : "text-base"));
const shouldTruncateName = computed(() => safeNameLength.value > 18);

function formatMoney(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatQuantity(value) {
  return `${new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2,
  }).format(value)} 股`;
}

function onDetailClick() {
  ElMessage.info("功能开发中");
}
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
        <h3 class="font-semibold text-gray-800 dark:text-gray-100 leading-none"
          :class="[nameClass, shouldTruncateName ? 'truncate' : '']"
          :title="shouldTruncateName ? safeName : ''">{{ safeName }}
        </h3>
      </div>

      <span class="rounded-full px-2 py-1 text-xs font-semibold" :class="isProfit
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        ">
        {{ isProfit ? "+" : "" }}{{ profitPercent.toFixed(2) }}%
      </span>
    </header>

    <div class="grid grid-cols-3 gap-2">
      <div
        class="min-h-[4.6rem] rounded-xl border border-gray-100 bg-gray-50/80 px-2 py-2 dark:border-gray-700 dark:bg-gray-700/30 flex flex-col items-center justify-center text-center">
        <p class="text-[11px] text-gray-500 dark:text-gray-400">市价</p>
        <p class="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{{ formatMoney(safeCurrentPrice) }}</p>
      </div>
      <div
        class="min-h-[4.6rem] rounded-xl border border-gray-100 bg-gray-50/80 px-2 py-2 dark:border-gray-700 dark:bg-gray-700/30 flex flex-col items-center justify-center text-center">
        <p class="text-[11px] text-gray-500 dark:text-gray-400">成本</p>
        <p class="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{{ formatMoney(safeCostPrice) }}</p>
      </div>
      <div
        class="min-h-[4.6rem] rounded-xl border border-gray-100 bg-gray-50/80 px-2 py-2 dark:border-gray-700 dark:bg-gray-700/30 flex flex-col items-center justify-center text-center">
        <p class="text-[11px] text-gray-500 dark:text-gray-400">持仓</p>
        <p class="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{{ formatQuantity(safeQuantity) }}</p>
      </div>
    </div>

    <div
      class="relative flex-1 min-h-[11rem] overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
      <div class="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-3 pt-3">
        <span class="text-xs text-gray-500 dark:text-gray-400">盈亏(今日）</span>
        <span class="text-sm font-semibold"
          :class="isProfit ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'">
          {{ formatMoney(profitValue) }}
        </span>
      </div>

      <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="absolute inset-0 h-full w-full px-3 pb-3 pt-10">
        <defs>
          <linearGradient :id="trendFillId" x1="0" x2="0" y1="0" y2="1">
            <stop :stop-color="isProfit ? '#10b981' : '#ef4444'" stop-opacity="0.32" offset="0%" />
            <stop :stop-color="isProfit ? '#10b981' : '#ef4444'" stop-opacity="0.02" offset="100%" />
          </linearGradient>
        </defs>

        <path :d="trendAreaPath" :fill="`url(#${trendFillId})`" />
        <path :d="trendPath" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"
          :stroke="isProfit ? '#10b981' : '#ef4444'" />
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
