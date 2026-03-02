<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { ElMessage } from "element-plus";
import SmallAccountPicker from "@/components/ui/SmallAccountPicker.vue";
import { searchMarketInstruments } from "@/utils/markets";
import { getPayload } from "@/utils/apiPayload";
import { filterNonInvestmentAccounts } from "@/utils/accountFilters";
import { useInvestmentStore } from "@/stores/investment";

const props = defineProps({
  accounts: {
    type: Array,
    default: () => [],
  },
});

const investmentStore = useInvestmentStore();
const { trading } = storeToRefs(investmentStore);

const keywordInput = ref("");
const searchLoading = ref(false);
const searchResults = ref([]);
const showSearchDropdown = ref(false);
const selectedInstrument = ref(null);
const isComposing = ref(false);

const form = reactive({
  price: "",
  quantity: "",
  accountId: "",
});
const advancedMode = ref(false);
const selectableAccounts = computed(() => filterNonInvestmentAccounts(props.accounts));

const SEARCH_DEBOUNCE_MS = 250;
let searchRequestSeq = 0;

const MARKET_LABEL_MAP = {
  CN: "A股",
  HK: "港股",
  US: "美股",
  FX: "外汇",
  CRYPTO: "加密货币",
};

function normalizeQuery(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeMarketCode(value) {
  return String(value ?? "").trim().toUpperCase();
}

function getMarketLabel(code) {
  const normalized = normalizeMarketCode(code);
  return MARKET_LABEL_MAP[normalized] || normalized || "未知";
}

function getInstrumentId(item) {
  const raw = item?.instrument_id ?? item?.instrumentId;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function getSearchItemPrice(item) {
  const n = Number(
    item?.latest_price ??
    item?.price ??
    item?.last_price ??
    item?.current_price,
  );
  return Number.isFinite(n) && n > 0 ? String(n) : "";
}

function pickFirstAccountId() {
  const first = selectableAccounts.value?.[0]?.id;
  if (first === undefined || first === null) return "";
  return String(first);
}

function resetSearchResult(hide = false) {
  searchLoading.value = false;
  searchResults.value = [];
  if (hide) showSearchDropdown.value = false;
}

function resetForm() {
  keywordInput.value = "";
  selectedInstrument.value = null;
  form.price = "";
  form.quantity = "";
  form.accountId = pickFirstAccountId();
  advancedMode.value = false;
  resetSearchResult(true);
}

function onCompositionStart() {
  isComposing.value = true;
}

function onCompositionEnd() {
  isComposing.value = false;
  onSearchInput();
}

function onSearchInput() {
  if (isComposing.value) return;
  selectedInstrument.value = null;

  const query = normalizeQuery(keywordInput.value);
  if (!query) {
    resetSearchResult(true);
    return;
  }

  showSearchDropdown.value = true;
  debouncedExecuteSearch(query);
}

function onSearchFocus() {
  const query = normalizeQuery(keywordInput.value);
  if (!query || selectedInstrument.value) return;
  showSearchDropdown.value = true;
  executeSearch(query);
}

function onSearchEnter() {
  const query = normalizeQuery(keywordInput.value);
  if (!query) return;
  executeSearch(query);
}

function hideSearchDropdownSoon() {
  setTimeout(() => {
    showSearchDropdown.value = false;
  }, 120);
}

async function executeSearch(query) {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    resetSearchResult(true);
    return;
  }

  showSearchDropdown.value = true;
  searchLoading.value = true;
  const reqId = ++searchRequestSeq;

  try {
    const res = await searchMarketInstruments(normalized);
    if (reqId !== searchRequestSeq) return;
    const payload = getPayload(res, {});
    searchResults.value = Array.isArray(payload?.results) ? payload.results : [];
  } catch {
    if (reqId !== searchRequestSeq) return;
    resetSearchResult();
    ElMessage.error("搜索失败，请稍后重试。");
  } finally {
    if (reqId === searchRequestSeq) searchLoading.value = false;
  }
}

const debouncedExecuteSearch = useDebounceFn((query) => {
  executeSearch(query);
}, SEARCH_DEBOUNCE_MS);

function pickSearchResult(item) {
  const instrumentId = getInstrumentId(item);
  if (!Number.isFinite(instrumentId)) {
    ElMessage.error("该标的缺少 instrument_id，无法买入");
    return;
  }

  selectedInstrument.value = item;
  keywordInput.value = String(item?.short_code ?? item?.symbol ?? "").trim().toUpperCase();
  form.price = getSearchItemPrice(item);
  showSearchDropdown.value = false;
}

function onAdvancedChange() {
  ElMessage.info("该功能正在开发");
}

const canSubmit = computed(() => {
  const instrumentId = getInstrumentId(selectedInstrument.value);
  const price = Number(form.price);
  const quantity = Number(form.quantity);
  const accountId = Number(form.accountId);
  return (
    !trading.value &&
    Number.isFinite(instrumentId) &&
    Number.isFinite(price) &&
    price > 0 &&
    Number.isFinite(quantity) &&
    quantity > 0 &&
    Number.isFinite(accountId) &&
    accountId > 0
  );
});

async function onSubmit() {
  const instrumentId = getInstrumentId(selectedInstrument.value);
  if (!Number.isFinite(instrumentId)) {
    ElMessage.warning("当前搜索结果未返回 instrument_id，请检查后端搜索接口字段");
    return;
  }

  try {
    await investmentStore.buyPosition({
      instrument_id: instrumentId,
      price: Number(form.price),
      quantity: Number(form.quantity),
      cash_account_id: Number(form.accountId),
    });
    ElMessage.success("买入成功");
    resetForm();
  } catch (err) {
    const message = err?.message ? String(err.message) : "买入失败，请稍后重试";
    ElMessage.error(message);
  }
}

watch(
  selectableAccounts,
  () => {
    const exists = selectableAccounts.value.some((account) => String(account?.id) === String(form.accountId));
    if (!exists) form.accountId = pickFirstAccountId();
  },
  { deep: true, immediate: true },
);

</script>

<template>
  <article class="card-base !overflow-visible !px-3 !py-2.5 min-h-[22rem] gap-2.5">
    <header class="grid grid-cols-[1fr_auto_1fr] items-center">
      <div></div>
      <div class="flex items-center justify-center gap-2">
        <h3 class="text-base font-semibold text-gray-800 dark:text-gray-100">添加交易</h3>
        <label
          class="inline-flex h-6 cursor-pointer select-none items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100 px-2 text-[11px] font-semibold text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
          <input v-model="advancedMode" type="checkbox"
            class="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:outline-none focus:ring-0 focus:ring-offset-0 dark:border-gray-500 dark:bg-gray-800"
            @change="onAdvancedChange" />
          <span>高级</span>
        </label>
      </div>
      <span
        class="justify-self-end inline-flex h-7 w-7 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
        +
      </span>
    </header>

    <div class="space-y-2.5">
      <div class="relative mx-auto w-full max-w-[16.75rem]">
        <label class="mb-0.5 block text-[11px] font-medium text-gray-500 dark:text-gray-400">股票代码</label>
        <input v-model="keywordInput" type="text" placeholder="输入股票代码或名称"
          class="input-base px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200" @input="onSearchInput"
          @focus="onSearchFocus" @keyup.enter="onSearchEnter" @compositionstart="onCompositionStart"
          @compositionend="onCompositionEnd" @blur="hideSearchDropdownSoon" />

        <div v-if="showSearchDropdown"
          class="market-search-dropdown !left-1/2 !right-auto !w-[min(92vw,24rem)] -translate-x-1/2 sm:!left-0 sm:!right-0 sm:!w-auto sm:translate-x-0">
          <div class="market-search-head !grid-cols-[62px_minmax(0,1fr)_46px] !gap-1 !px-2 sm:!grid-cols-[84px_minmax(0,1fr)_56px] sm:!gap-1.5 sm:!px-2">
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
              :key="item.instrument_id ?? `${item.short_code}-${item.name}-${item.market}`" type="button"
              class="market-search-item !px-2 sm:!px-2" @mousedown.prevent="pickSearchResult(item)">
              <div class="market-search-grid !grid-cols-[62px_minmax(0,1fr)_46px] !gap-1 sm:!grid-cols-[84px_minmax(0,1fr)_56px] sm:!gap-1.5">
                <span
                  class="block min-w-0 truncate whitespace-nowrap font-mono text-[13px] font-semibold text-gray-800 dark:text-gray-100">
                  {{ item.short_code }}
                </span>
                <span class="block min-w-0 truncate whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                  {{ item.name }}
                </span>
                <span class="text-right">
                  <span class="market-market-tag !px-1 !py-0 !text-[11px]">{{ getMarketLabel(item.market) }}</span>
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="mx-auto w-full max-w-[16.75rem]">
        <label class="mb-0.5 block text-[11px] font-medium text-gray-500 dark:text-gray-400">买入价</label>
        <input v-model="form.price" type="number" inputmode="decimal" min="0" step="any"
          class="input-base px-3 py-1.5 text-sm" placeholder="请输入价格" @keydown.enter.prevent="onSubmit" />
      </div>

      <div class="mx-auto w-full max-w-[16.75rem]">
        <label class="mb-0.5 block text-[11px] font-medium text-gray-500 dark:text-gray-400">买入数量</label>
        <input v-model="form.quantity" type="number" inputmode="decimal" min="0" step="any"
          class="input-base px-3 py-1.5 text-sm" placeholder="请输入数量" @keydown.enter.prevent="onSubmit" />
      </div>

      <div class="mx-auto w-full max-w-[16.75rem]">
        <label class="mb-0.5 block text-[11px] font-medium text-gray-500 dark:text-gray-400">扣款账户</label>
        <SmallAccountPicker v-model="form.accountId" :accounts="selectableAccounts" placeholder="请选择账户"
          placement="up" :max-list-height="176" />
      </div>
    </div>

    <button type="button"
      class="button-base mt-auto mx-auto w-full max-w-[16.75rem] !justify-center !rounded-xl !py-2 !text-sm !font-semibold !bg-emerald-50 !text-emerald-700 !border-emerald-100 hover:!bg-emerald-100 dark:!bg-emerald-900/30 dark:!text-emerald-200 dark:!border-emerald-800 dark:hover:!bg-emerald-900/50"
      :disabled="!canSubmit" @click="onSubmit">
      {{ trading ? "提交中..." : "确定买入" }}
    </button>
  </article>
</template>
