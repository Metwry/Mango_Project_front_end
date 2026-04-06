<script setup>
import { toRef } from "vue";
import SmallAccountPicker from "@/components/ui/SmallAccountPicker.vue";
import { getMarketLabel } from "@/utils/marketMeta";
import { useAddPositionCard } from "@/composables/useAddPositionCard";

const props = defineProps({
  accounts: {
    type: Array,
    default: () => [],
  },
});

const {
  trading,
  keywordInput,
  searchLoading,
  searchResults,
  showSearchDropdown,
  form,
  advancedMode,
  selectableAccounts,
  onCompositionStart,
  onCompositionEnd,
  onSearchInput,
  onSearchFocus,
  onSearchEnter,
  hideSearchDropdownSoon,
  pickSearchResult,
  onAdvancedChange,
  canSubmit,
  onSubmit,
} = useAddPositionCard(toRef(props, "accounts"));

</script>

<template>
  <article class="card-base !overflow-visible !px-3 !py-2.5 min-h-[22rem] gap-2.5">
    <header class="grid grid-cols-[1fr_auto_1fr] items-center">
      <div></div>
      <div class="flex items-center justify-center gap-2">
        <h3 class="text-base font-semibold text-gray-800 dark:text-gray-100">添加交易</h3>
        <label
          class="surface-chip inline-flex h-6 cursor-pointer select-none items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100 px-2 text-[11px] font-semibold text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
          <input v-model="advancedMode" type="checkbox"
            class="h-3.5 w-3.5 rounded border-gray-300 text-gray-500 dark:text-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0 dark:border-gray-500 dark:bg-gray-800"
            @change="onAdvancedChange" />
          <span>高级</span>
        </label>
      </div>
    </header>

    <div class="space-y-2.5">
      <div class="relative mx-auto w-full max-w-[16.75rem]">
        <label class="mb-0.5 block text-[11px] font-medium text-gray-500 dark:text-gray-400">股票代码</label>
        <input v-model="keywordInput" type="text"
          class="input-base px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200" @input="onSearchInput"
          @focus="onSearchFocus" @keyup.enter="onSearchEnter" @compositionstart="onCompositionStart"
          @compositionend="onCompositionEnd" @blur="hideSearchDropdownSoon" />

        <div v-if="showSearchDropdown"
          class="market-search-dropdown !left-1/2 !right-auto !w-[min(92vw,24rem)] -translate-x-1/2 sm:!left-0 sm:!right-0 sm:!w-auto sm:translate-x-0">
          <div
            class="market-search-head !grid-cols-[54px_minmax(0,1fr)_42px] !gap-x-0.5 !px-2 sm:!grid-cols-[72px_minmax(0,1fr)_52px] sm:!gap-x-1 sm:!px-2">
            <span class="truncate whitespace-nowrap">代码</span>
            <span class="truncate whitespace-nowrap">名称</span>
            <span class="truncate whitespace-nowrap text-right">市场</span>
          </div>

          <div class="max-h-[38vh] overflow-y-auto overscroll-contain sm:max-h-56">
            <div v-if="searchLoading" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">正在搜索...</div>
            <div v-else-if="searchResults.length === 0" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              未找到匹配标的
            </div>

            <button v-for="item in searchResults"
              :key="item.instrument_id"
              type="button" class="market-search-item !px-2 sm:!px-2" @mousedown.prevent="pickSearchResult(item)">
              <div
                class="market-search-grid !grid-cols-[54px_minmax(0,1fr)_42px] !gap-x-0.5 sm:!grid-cols-[72px_minmax(0,1fr)_52px] sm:!gap-x-1">
                <span
                  class="block min-w-0 truncate whitespace-nowrap font-mono text-[13px] font-semibold text-gray-800 dark:text-gray-100">
                  {{ item.short_code || "--" }}
                </span>
                <span class="block min-w-0 truncate whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400"
                  :title="item.name">
                  {{ item.name || "--" }}
                </span>
                <span class="text-right">
                  <span class="market-market-tag !px-1 !py-0 !text-[11px]">{{ getMarketLabel(item.market, "未知") }}</span>
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="mx-auto w-full max-w-[16.75rem]">
        <label class="mb-0.5 block text-[11px] font-medium text-gray-500 dark:text-gray-400">买入价</label>
        <input v-model="form.price" type="number" inputmode="decimal" min="0" step="any"
          class="input-base px-3 py-1.5 text-sm" @keydown.enter.prevent="onSubmit" />
      </div>

      <div class="mx-auto w-full max-w-[16.75rem]">
        <label class="mb-0.5 block text-[11px] font-medium text-gray-500 dark:text-gray-400">买入数量</label>
        <input v-model="form.quantity" type="number" inputmode="decimal" min="0" step="any"
          class="input-base px-3 py-1.5 text-sm" @keydown.enter.prevent="onSubmit" />
      </div>

      <div class="mx-auto w-full max-w-[16.75rem]">
        <label class="mb-0.5 block text-[11px] font-medium text-gray-500 dark:text-gray-400">扣款账户</label>
        <SmallAccountPicker v-model="form.accountId" :accounts="selectableAccounts" placeholder="请选择账户" placement="up"
          :max-list-height="176" />
      </div>
    </div>

    <div class="add-position-submit-bar mt-auto">
      <button type="button"
        class="button-base mx-auto w-full max-w-[16.75rem] !justify-center !rounded-xl !py-2 !text-sm !font-semibold !bg-emerald-50 !text-emerald-700 !border-transparent hover:!bg-emerald-100 dark:!bg-[#0f3a2c] dark:!text-[#8ff0c9] dark:!border-transparent dark:hover:!bg-[#124735]"
        :disabled="!canSubmit" @click="onSubmit">
        {{ trading ? "提交中..." : "确定买入" }}
      </button>
    </div>
  </article>
</template>

<style>
@media (max-width: 767px) {
  .add-position-submit-bar {
    position: sticky;
    bottom: 0;
    z-index: 5;
    margin-inline: -0.25rem;
    padding: 0.75rem 0.25rem calc(0.25rem + env(safe-area-inset-bottom));
    background: linear-gradient(to top, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0));
    backdrop-filter: blur(6px);
  }

  .dark .add-position-submit-bar {
    background: linear-gradient(to top, rgba(17, 24, 39, 0.98), rgba(17, 24, 39, 0.82), rgba(17, 24, 39, 0));
  }
}
</style>
