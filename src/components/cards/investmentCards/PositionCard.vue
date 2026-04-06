<script setup>
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import VChart from "vue-echarts";
import TradePositionPanel from "@/components/modals/TradePositionPanel.vue";
import { usePositionCard } from "@/composables/usePositionCard";

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

const {
  trading,
  tradeMode,
  tradePanelVisible,
  tradeTransitionName,
  logoLoadFailed,
  trendLoading,
  trendFetchError,
  safeName,
  safeSymbol,
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
} = usePositionCard(props);
</script>

<template>
  <article
    class="card-base !border-2 min-h-[24rem] gap-3 transition-all duration-200 ease-linear hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
    :style="cardThemeStyle">
    <header class="flex items-center gap-3 min-h-12">
      <div
        class="h-12 w-12 rounded-xl grid place-items-center text-sm font-bold text-gray-700 bg-gray-100 dark:text-gray-100 dark:bg-[#16181d]">
        <img v-if="showLogoImage" :src="logoUrl" :alt="safeName" loading="lazy" decoding="async"
          @error="logoLoadFailed = true" class="h-full w-full rounded-xl object-contain p-1" />
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
        class="min-h-[4.6rem] rounded-xl border-2 border-gray-100 bg-[var(--surface-1)] px-2 py-2 flex flex-col items-center justify-center text-center dark:border-[var(--border-subtle)] dark:bg-[var(--surface-1)]"
        :style="statBorderStyle">
        <p class="text-[11px] text-gray-500 dark:text-gray-400">市场价</p>
        <p class="mt-1 text-sm font-semibold text-black dark:text-white">{{ currentPriceText }}</p>
        <p v-if="!hasCurrentPrice" class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">待接入</p>
      </div>
      <div
        class="min-h-[4.6rem] rounded-xl border-2 border-gray-100 bg-[var(--surface-1)] px-2 py-2 flex flex-col items-center justify-center text-center dark:border-[var(--border-subtle)] dark:bg-[var(--surface-1)]"
        :style="statBorderStyle">
        <p class="text-[11px] text-gray-500 dark:text-gray-400">成本价</p>
        <p class="mt-1 text-sm font-semibold text-black dark:text-white">{{ costPriceText }}</p>
      </div>
      <div
        class="min-h-[4.6rem] rounded-xl border-2 border-gray-100 bg-[var(--surface-1)] px-2 py-2 flex flex-col items-center justify-center text-center dark:border-[var(--border-subtle)] dark:bg-[var(--surface-1)]"
        :style="statBorderStyle">
        <p class="text-[11px] text-gray-500 dark:text-gray-400">持仓数量</p>
        <p class="mt-1 text-sm font-semibold text-black dark:text-white">{{ quantityText }}</p>
      </div>
    </div>

    <div
      class="relative flex-1 min-h-[11rem] overflow-hidden rounded-2xl border border-gray-100 bg-[var(--surface-1)] dark:border-[var(--border-subtle)] dark:bg-[var(--surface-1)]">
      <div class="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-3 pt-3">
        <span class="text-xs text-gray-500 dark:text-gray-400">{{ trendHeaderLabel }}</span>
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
          class="button-base !justify-center !rounded-xl !py-2 !text-xs !font-semibold !bg-emerald-50 !text-emerald-700 !border-transparent hover:!bg-emerald-100 dark:!bg-[#123128] dark:!text-emerald-200 dark:!border-transparent dark:hover:!bg-[#174236]"
          :disabled="trading" @click="openTradePanel('buy')">
          买入
        </button>
        <button type="button" data-trade-trigger="true"
          class="button-base !justify-center !rounded-xl !py-2 !text-xs !font-semibold !bg-red-50 !text-red-700 !border-transparent hover:!bg-red-100 dark:!bg-[#34191d] dark:!text-red-200 dark:!border-transparent dark:hover:!bg-[#482126]"
          :disabled="trading" @click="openTradePanel('sell')">
          卖出
        </button>
        <button type="button"
          class="button-base !justify-center !rounded-xl !py-2 !text-xs !font-semibold !border-transparent dark:!border-transparent"
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
