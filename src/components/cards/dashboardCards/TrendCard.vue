<script setup>
import { toRef } from "vue";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import VChart from "vue-echarts";
import SmallAccountPicker from "@/components/ui/SmallAccountPicker.vue";
import { useDashboardTrendCard } from "@/composables/useDashboardTrendCard";

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent]);

const props = defineProps({
  accounts: {
    type: Array,
    default: () => [],
  },
});

const {
  RANGE_OPTIONS,
  accountId,
  activeRangeKey,
  loading,
  queryError,
  hasData,
  chartOption,
} = useDashboardTrendCard(toRef(props, "accounts"));
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
              ? '!bg-gray-100 !text-gray-900 !border-gray-300 dark:!bg-[#2c3138] dark:!text-white dark:!border-[#343a42]'
              : ''" @click="activeRangeKey = item.key">
            {{ item.label }}
          </button>
        </div>

        <div class="w-full sm:w-56 sm:shrink-0">
          <SmallAccountPicker v-model="accountId" :accounts="accounts" />
        </div>
      </div>
    </div>

    <div class="flex-1 rounded-xl border border-gray-200 bg-transparent p-2 dark:border-gray-700 dark:bg-transparent">
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
