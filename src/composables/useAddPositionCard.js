import { computed, reactive, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { ElMessage } from "@/utils/element";
import { searchMarketInstruments } from "@/utils/markets";
import { filterNonInvestmentAccounts } from "@/utils/accounts";
import { useInvestmentStore } from "@/stores/investment";
import { SEARCH_CONFIG } from "@/config/Config";

const SEARCH_DEBOUNCE_MS = SEARCH_CONFIG.addPosition.debounceMs;
const SEARCH_DROPDOWN_HIDE_DELAY_MS = SEARCH_CONFIG.addPosition.dropdownHideDelayMs;

function normalizeQuery(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function useAddPositionCard(accounts) {
  const investmentStore = useInvestmentStore();
  const { trading } = storeToRefs(investmentStore);

  const keywordInput = ref("");
  const searchLoading = ref(false);
  const searchResults = ref([]);
  const showSearchDropdown = ref(false);
  const selectedInstrument = ref(null);
  const isComposing = ref(false);
  const advancedMode = ref(false);
  let searchRequestSeq = 0;

  const form = reactive({
    price: "",
    quantity: "",
    accountId: "",
  });

  const selectableAccounts = computed(() => filterNonInvestmentAccounts(accounts.value));

  function pickFirstAccountId() {
    return String(selectableAccounts.value[0]?.id ?? "");
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
      searchResults.value = res.data.results;
    } catch {
      if (reqId !== searchRequestSeq) return;
      resetSearchResult();
    } finally {
      if (reqId === searchRequestSeq) searchLoading.value = false;
    }
  }

  const debouncedExecuteSearch = useDebounceFn((query) => {
    void executeSearch(query);
  }, SEARCH_DEBOUNCE_MS);

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
    void executeSearch(query);
  }

  function onSearchEnter() {
    const query = normalizeQuery(keywordInput.value);
    if (!query) return;
    void executeSearch(query);
  }

  function hideSearchDropdownSoon() {
    setTimeout(() => {
      showSearchDropdown.value = false;
    }, SEARCH_DROPDOWN_HIDE_DELAY_MS);
  }

  function pickSearchResult(item) {
    selectedInstrument.value = item;
    keywordInput.value = item.short_code;
    form.price = "";
    showSearchDropdown.value = false;
  }

  function onAdvancedChange() {
    advancedMode.value = false;
    ElMessage.info("该功能正在开发");
  }

  const canSubmit = computed(() => (
    !trading.value &&
    !!selectedInstrument.value &&
    Number(form.price) > 0 &&
    Number(form.quantity) > 0 &&
    Number(form.accountId) > 0
  ));

  async function onSubmit() {
    try {
      await investmentStore.buyPosition({
        instrument_id: selectedInstrument.value.instrument_id,
        price: Number(form.price),
        quantity: Number(form.quantity),
        cash_account_id: Number(form.accountId),
      });
      ElMessage.success("买入成功");
      resetForm();
    } catch {
      // API interceptor already handles visible error feedback.
    }
  }

  watch(
    selectableAccounts,
    () => {
      const exists = selectableAccounts.value.some((account) => String(account.id) === String(form.accountId));
      if (!exists) form.accountId = pickFirstAccountId();
    },
    { deep: true, immediate: true },
  );

  return {
    trading,
    keywordInput,
    searchLoading,
    searchResults,
    showSearchDropdown,
    selectedInstrument,
    isComposing,
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
  };
}
