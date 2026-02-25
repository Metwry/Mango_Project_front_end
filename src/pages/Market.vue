<script setup>
import { useMarketPage } from "@/composables/useMarketPage";

const {
  allQuotes,
  changeClass,
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
</script>

<template>
  <div class="h-full w-full min-h-0">
    <div class="flex flex-col lg:flex-row gap-4 h-full min-h-0">
      <section class="card-base flex-1 h-full min-h-0 p-4 md:p-5">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div class="flex-1 max-w-2xl">
            <div class="flex items-center gap-3">
              <div class="relative flex-1 max-w-xl">
                <input v-model="keywordInput" type="text" placeholder="输入股票代码或名称以添加"
                  class="input-base h-10 px-3 text-sm text-gray-700" @input="onSearchInput" @focus="onSearchFocus"
                  @keyup.enter="onSearchEnter" @compositionstart="onCompositionStart" @compositionend="onCompositionEnd"
                  @blur="hideSearchDropdownSoon" />

                <div v-if="showSearchDropdown" class="market-search-dropdown">
                  <div class="market-search-head">
                    <span>代码</span>
                    <span>名称</span>
                    <span class="text-right">市场</span>
                  </div>

                  <div class="max-h-64 overflow-y-auto">
                    <div v-if="searchLoading" class="px-3 py-2 text-sm text-gray-500">正在搜索...</div>
                    <div v-else-if="searchResults.length === 0" class="px-3 py-2 text-sm text-gray-500">
                      未找到匹配的股票代码或名称
                    </div>

                    <button v-for="item in searchResults" :key="`${item.short_code}-${item.name}-${item.market}`"
                      type="button" class="market-search-item" @mousedown.prevent="pickSearchResult(item)">
                      <div class="market-search-grid">
                        <span class="text-sm font-semibold text-gray-800 font-mono tabular-nums truncate">
                          {{ item.short_code }}
                        </span>
                        <span class="text-sm text-gray-500 truncate">{{ item.name }}</span>
                        <span class="text-right">
                          <span class="market-market-tag">{{ getMarketLabel(item.market) }}</span>
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <span class="text-xs text-gray-500 whitespace-nowrap shrink-0">更新时间：{{ formatUpdatedAt(updatedAt)
                }}</span>
            </div>

            <p class="text-xs text-gray-500 mt-2">当前：{{ selectedMarketLabel }}，共 {{ visibleQuotes.length }} 条</p>
          </div>
        </div>

        <div v-if="loading" class="flex-1 min-h-0 grid place-items-center py-10 text-sm text-gray-500">正在加载行情数据...</div>
        <div v-else-if="error" class="flex-1 min-h-0 grid place-items-center py-10 text-sm text-red-600">行情加载失败，请稍后重试。
        </div>
        <div v-else-if="visibleQuotes.length === 0"
          class="flex-1 min-h-0 grid place-items-center py-10 text-sm text-gray-500">
          未找到符合条件的行情数据。
        </div>

        <div v-else class="flex-1 min-h-0 overflow-auto pr-1">
          <table class="min-w-[1140px] w-full table-fixed text-sm border-separate [border-spacing:0_8px]">
            <colgroup>
              <col class="w-[110px]" />
              <col class="w-[220px]" />
              <col class="w-[90px]" />
              <col class="w-[120px]" />
              <col class="w-[100px]" />
              <col class="w-[110px]" />
              <col class="w-[110px]" />
              <col class="w-[110px]" />
              <col class="w-[100px]" />
              <col class="w-[90px]" />
            </colgroup>
            <thead>
              <tr class="text-left text-gray-500">
                <th class="py-2 px-3 font-medium whitespace-nowrap">代码</th>
                <th class="py-2 px-3 font-medium whitespace-nowrap">名称</th>
                <th class="py-2 px-3 font-medium whitespace-nowrap">市场</th>
                <th class="py-2 px-3 font-medium whitespace-nowrap">最新价</th>
                <th class="py-2 px-3 font-medium whitespace-nowrap">涨跌幅</th>
                <th class="py-2 px-3 font-medium whitespace-nowrap">昨收</th>
                <th class="py-2 px-3 font-medium whitespace-nowrap">今日最高</th>
                <th class="py-2 px-3 font-medium whitespace-nowrap">今日最低</th>
                <th class="py-2 px-3 font-medium whitespace-nowrap">成交量(万股)</th>
                <th class="py-2 px-3 font-medium whitespace-nowrap">操作</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="quote in visibleQuotes" :key="quote._rowKey">
                <td
                  class="py-3 px-3 text-gray-800 font-medium bg-white border-y border-l border-gray-100 rounded-l-xl whitespace-nowrap">
                  {{ quote.short_code || "--" }}
                </td>
                <td class="py-3 px-3 text-gray-600 bg-white border-y border-gray-100">
                  <div class="truncate" :title="quote.name || '--'">{{ quote.name || "--" }}</div>
                </td>
                <td class="py-3 px-3 text-gray-600 bg-white border-y border-gray-100 whitespace-nowrap">{{
                  quote.marketLabel || "--" }}</td>
                <td class="py-3 px-3 text-gray-800 bg-white border-y border-gray-100 whitespace-nowrap">{{
                  formatPrice(quote.price, quote.market) }}</td>
                <td class="py-3 px-3 font-medium bg-white border-y border-gray-100 whitespace-nowrap"
                  :class="changeClass(quote.pct)">
                  {{ formatPercent(quote.pct) }}
                </td>
                <td class="py-3 px-3 text-gray-600 bg-white border-y border-gray-100 whitespace-nowrap">{{
                  formatPrice(quote.prev_close, quote.market) }}</td>
                <td class="py-3 px-3 text-gray-600 bg-white border-y border-gray-100 whitespace-nowrap">{{
                  formatPrice(quote.day_high, quote.market) }}</td>
                <td class="py-3 px-3 text-gray-600 bg-white border-y border-gray-100 whitespace-nowrap">{{
                  formatPrice(quote.day_low, quote.market) }}</td>
                <td class="py-3 px-3 text-gray-600 bg-white border-y border-gray-100 whitespace-nowrap">{{
                  formatVolume(quote.volume, quote.market) }}</td>
                <td class="py-3 px-3 bg-white border-y border-r border-gray-100 rounded-r-xl whitespace-nowrap">
                  <button type="button"
                    class="button-base !justify-center !px-3 !py-1.5 !rounded-lg !text-xs !text-red-600 !bg-red-50 !border-red-100 hover:!bg-red-100"
                    @click="onDeleteClick(quote)">
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside class="card-base w-full lg:w-[170px] shrink-0 h-full p-3">
        <p class="text-sm font-semibold text-gray-800 mb-3">自选</p>

        <div class="space-y-2">
          <button type="button" class="button-base w-full text-sm !px-2.5"
            :class="selectedMarket === 'ALL' ? '!bg-gray-900 !text-white !border-gray-900 shadow-sm' : ''"
            @click="chooseMarket('ALL')">
            <span>全部</span>
            <span class="text-xs opacity-80">{{ allQuotes.length }}</span>
          </button>

          <button v-for="item in marketButtons" :key="item.market" type="button"
            class="button-base w-full text-sm !px-2.5"
            :class="selectedMarket === item.market ? '!bg-gray-900 !text-white !border-gray-900 shadow-sm' : ''"
            @click="chooseMarket(item.market)">
            <span>{{ item.label }}</span>
            <span class="text-xs opacity-80">{{ item.count }}</span>
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>