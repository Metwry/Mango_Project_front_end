<script setup>
import { computed, ref } from "vue";
import { onClickOutside } from "@vueuse/core";
import BaseIcon from "@/components/ui/BaseIcon.vue";
import { useMarketPage } from "@/composables/useMarketPage";

const {
  allQuotes,
  changeBadgeClass,
  chooseMarket,
  formatPercent,
  formatPrice,
  formatUpdatedAt,
  formatVolume,
  getMarketLabel,
  hideSearchDropdownSoon,
  keywordInput,
  loading,
  marketButtons,
  onCompositionEnd,
  onCompositionStart,
  onDeleteClick,
  onSearchEnter,
  onSearchFocus,
  onSearchInput,
  pickSearchResult,
  searchLoading,
  searchResults,
  selectedMarket,
  selectedMarketLabel,
  showSearchDropdown,
  updatedAt,
  visibleQuotes,
  error,
} = useMarketPage();

const marketDropdownOpen = ref(false);
const marketDropdownWrapRef = ref(null);

const marketOptions = computed(() => [
  { market: "ALL", label: "全部", count: allQuotes.value.length },
  ...marketButtons.value,
]);

const currentMarketCount = computed(() => {
  if (selectedMarket.value === "ALL") return allQuotes.value.length;
  return marketButtons.value.find((item) => item.market === selectedMarket.value)?.count ?? 0;
});

function toggleMarketDropdown() {
  marketDropdownOpen.value = !marketDropdownOpen.value;
}

function onPickMarket(market) {
  chooseMarket(market);
  marketDropdownOpen.value = false;
}

onClickOutside(marketDropdownWrapRef, () => {
  marketDropdownOpen.value = false;
});
</script>

<template>
  <div class="h-full w-full min-h-0 min-w-0 bg-gray-50 dark:bg-gray-900">
    <section class="card-base flex-1 h-full min-h-0 min-w-0 p-4 md:p-5">
      <div class="mb-4">
        <div class="w-full">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div ref="marketDropdownWrapRef" class="relative w-full shrink-0 sm:w-[220px]">
              <button type="button" class="dropdown-trigger" @click="toggleMarketDropdown">
                <span class="truncate text-sm text-gray-700 dark:text-gray-200">
                  自选：{{ selectedMarketLabel }}（{{ currentMarketCount }}）
                </span>
                <BaseIcon name="arrow" class="dropdown-arrow" :class="marketDropdownOpen ? 'rotate-180' : ''" />
              </button>

              <Transition name="dropdown-drawer">
                <div v-if="marketDropdownOpen" class="dropdown-panel absolute left-0 top-[calc(100%+8px)] w-full">
                  <div class="dropdown-list">
                    <button v-for="item in marketOptions" :key="item.market" type="button" class="dropdown-item" :class="selectedMarket === item.market
                      ? 'dropdown-item-active'
                      : 'dropdown-item-idle'" @click="onPickMarket(item.market)">
                      <span class="flex items-center justify-between">
                        <span>{{ item.label }}</span>
                        <span class="text-xs opacity-80">{{ item.count }}</span>
                      </span>
                    </button>
                  </div>
                </div>
              </Transition>
            </div>

            <div class="relative min-w-0 flex-1">
              <input v-model="keywordInput" type="text" placeholder="输入股票代码或名称以添加"
                class="input-base h-10 px-3 text-sm text-gray-700 dark:text-gray-200" @input="onSearchInput"
                @focus="onSearchFocus" @keyup.enter="onSearchEnter" @compositionstart="onCompositionStart"
                @compositionend="onCompositionEnd" @blur="hideSearchDropdownSoon" />

              <div v-if="showSearchDropdown" class="market-search-dropdown">
                <div class="market-search-head">
                  <span class="truncate whitespace-nowrap">代码</span>
                  <span class="truncate whitespace-nowrap">名称</span>
                  <span class="truncate whitespace-nowrap text-right">市场</span>
                </div>

                <div class="max-h-64 overflow-y-auto">
                  <div v-if="searchLoading" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">正在搜索...</div>
                  <div v-else-if="searchResults.length === 0"
                    class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    未找到匹配的股票代码或名称
                  </div>

                  <button v-for="item in searchResults" :key="`${item.short_code}-${item.name}-${item.market}`"
                    type="button" class="market-search-item" @mousedown.prevent="pickSearchResult(item)">
                    <div class="market-search-grid">
                      <span
                        class="block min-w-0 truncate text-sm font-semibold text-gray-800 dark:text-gray-100 font-mono tabular-nums">
                        {{ item.short_code }}
                      </span>
                      <span class="block min-w-0 truncate text-sm text-gray-500 dark:text-gray-400">{{ item.name
                      }}</span>
                      <span class="text-right">
                        <span class="market-market-tag">{{ getMarketLabel(item.market) }}</span>
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0 sm:ml-1">
              <每 10 分钟更新> 更新时间：{{
                formatUpdatedAt(updatedAt)
              }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="loading" class="flex-1 min-h-0 grid place-items-center py-10 text-sm text-gray-500 dark:text-gray-400">
        正在加载行情数据...
      </div>
      <div v-else-if="error" class="flex-1 min-h-0 grid place-items-center py-10 text-sm text-red-600">行情加载失败，请稍后重试。
      </div>
      <div v-else-if="visibleQuotes.length === 0"
        class="flex-1 min-h-0 grid place-items-center py-10 text-sm text-gray-500 dark:text-gray-400">
        未找到符合条件的行情数据。
      </div>

      <div v-else class="flex-1 min-h-0 overflow-auto pr-1">
        <table class="min-w-[1080px] w-full table-fixed text-sm border-separate [border-spacing:0_8px]">
          <colgroup>
            <col class="w-[84px]" />
            <col class="w-[98px]" />
            <col class="w-[170px]" />
            <col class="w-[106px]" />
            <col class="w-[102px]" />
            <col class="w-[102px]" />
            <col class="w-[102px]" />
            <col class="w-[102px]" />
            <col class="w-[108px]" />
            <col class="w-[86px]" />
          </colgroup>
          <thead class="bg-gray-100/80 dark:bg-gray-700/60">
            <tr class="text-gray-500 dark:text-gray-300 text-xs">
              <th class="py-2 px-2.5 font-medium text-center whitespace-nowrap">市场</th>
              <th class="py-2 px-2.5 font-medium text-center whitespace-nowrap">代码</th>
              <th class="py-2 px-2.5 font-medium text-left whitespace-nowrap">名称</th>
              <th class="py-2 px-2.5 font-medium text-center whitespace-nowrap">最新价</th>
              <th class="py-2 px-2.5 font-medium text-center whitespace-nowrap">涨跌幅</th>
              <th class="py-2 px-2.5 font-medium text-center whitespace-nowrap">今日最高</th>
              <th class="py-2 px-2.5 font-medium text-center whitespace-nowrap">今日最低</th>
              <th class="py-2 px-2.5 font-medium text-center whitespace-nowrap">昨收</th>
              <th class="py-2 px-2.5 font-medium text-center whitespace-nowrap">成交量(亿)</th>
              <th class="py-2 px-2.5 font-medium text-center whitespace-nowrap"></th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="quote in visibleQuotes" :key="quote._rowKey">
              <td
                class="py-3 px-2.5 text-gray-800 dark:text-gray-100 font-medium text-center bg-white dark:bg-gray-800 border-y border-l border-gray-100 dark:border-gray-700 rounded-l-xl whitespace-nowrap">
                {{ quote.marketLabel || "--" }}
              </td>
              <td
                class="py-3 px-2.5 text-gray-800 dark:text-gray-100 font-medium text-center font-mono tabular-nums bg-white dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700 whitespace-nowrap">
                {{ quote.short_code || "--" }}
              </td>
              <td
                class="py-3 px-2.5 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700">
                <div class="truncate" :title="quote.name || '--'">{{ quote.name || "--" }}</div>
              </td>
              <td
                class="py-3 px-2.5 text-center tabular-nums bg-white dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700 whitespace-nowrap">
                <span
                  class="inline-flex items-center justify-center px-2 py-1 rounded-xl border border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 ">
                  {{ formatPrice(quote.price, quote.market) }}
                </span>
              </td>
              <td
                class="py-3 px-2.5 text-center bg-white dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700 whitespace-nowrap">
                <span
                  class="inline-flex items-center justify-center min-w-[78px] px-2 py-1 rounded-2xl border text-xs font-semibold"
                  :class="changeBadgeClass(quote.pct)">
                  {{ formatPercent(quote.pct) }}
                </span>
              </td>
              <td
                class="py-3 px-2.5 text-gray-600 dark:text-gray-300 text-center tabular-nums bg-white dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700 whitespace-nowrap">
                {{ formatPrice(quote.day_high, quote.market) }}
              </td>
              <td
                class="py-3 px-2.5 text-gray-600 dark:text-gray-300 text-center tabular-nums bg-white dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700 whitespace-nowrap">
                {{ formatPrice(quote.day_low, quote.market) }}
              </td>
              <td
                class="py-3 px-2.5 text-gray-600 dark:text-gray-300 text-center tabular-nums bg-white dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700 whitespace-nowrap">
                {{ formatPrice(quote.prev_close, quote.market) }}
              </td>
              <td
                class="py-3 px-2.5 text-gray-600 dark:text-gray-300 text-center tabular-nums bg-white dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700 whitespace-nowrap">
                {{ formatVolume(quote.volume, quote.market) }}
              </td>
              <td
                class="py-3 px-2.5 text-center bg-white dark:bg-gray-800 border-y border-r border-gray-100 dark:border-gray-700 rounded-r-xl whitespace-nowrap">
                <button type="button"
                  class="button-base !justify-center !px-3 !py-1.5 !rounded-xl !text-xs !text-red-600 !bg-red-50  hover:!bg-red-100 dark:!text-red-300 dark:!bg-red-900/20 dark:!border-red-800 dark:hover:!bg-red-900/40"
                  @click="onDeleteClick(quote)">
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
