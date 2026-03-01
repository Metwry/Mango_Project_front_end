import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useAccountsStore } from "@/stores/accounts";
import { useTransactionsStore } from "@/stores/transaction";

export function useBookkeepingPage() {
  const accountsStore = useAccountsStore();
  const transactionsStore = useTransactionsStore();

  const { accounts, loading: accountsLoading, error: accountsError } = storeToRefs(accountsStore);
  const {
    items: transactions,
    total: transactionsTotal,
    filters: txFilters,
    loading: transactionsLoading,
    error: transactionsError,
  } = storeToRefs(transactionsStore);

  const submitting = ref(false);
  const resetKey = ref(0);

  function updateAndFetch(patch) {
    transactionsStore.setFilters(patch);
    return transactionsStore.fetchList(patch);
  }

  function onPageChange(page) {
    return updateAndFetch({ page });
  }

  function onPageSizeChange(page_size) {
    return updateAndFetch({ page: 1, page_size });
  }

  function onSearchChange(filters) {
    return updateAndFetch({ page: 1, ...filters });
  }

  function onSearchReset() {
    const currentPageSize = Number(txFilters.value?.page_size) || 10;
    transactionsStore.resetFilters();
    return updateAndFetch({
      page: 1,
      page_size: currentPageSize,
    });
  }

  async function withSubmitting(task) {
    submitting.value = true;
    try {
      return await task();
    } finally {
      submitting.value = false;
    }
  }

  async function onReverseTransaction(id) {
    return withSubmitting(async () => {
      await transactionsStore.reverseOne(id);
      await accountsStore.fetchAccounts({ force: true });
    });
  }

  async function onSubmitTransaction(payload) {
    return withSubmitting(async () => {
      await transactionsStore.createOne(payload);
      resetKey.value += 1;

      await Promise.all([
        accountsStore.fetchAccounts({ force: true }),
        updateAndFetch({ page: 1 }),
      ]);
    });
  }

  onMounted(() => Promise.all([accountsStore.fetchAccounts(), onSearchReset()]));

  return {
    accounts,
    accountsError,
    accountsLoading,
    onPageChange,
    onPageSizeChange,
    onReverseTransaction,
    onSearchChange,
    onSearchReset,
    onSubmitTransaction,
    resetKey,
    submitting,
    transactions,
    transactionsError,
    transactionsLoading,
    transactionsTotal,
    txFilters,
  };
}
