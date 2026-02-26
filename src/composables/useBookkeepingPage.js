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
    transactionsStore.setFilters({
      page: 1,
      page_size: currentPageSize,
    });
    return transactionsStore.fetchList({
      page: 1,
      page_size: currentPageSize,
    });
  }

  async function onReverseTransaction(id) {
    submitting.value = true;
    try {
      await transactionsStore.reverseOne(id);
      await accountsStore.fetchAccounts({ force: true });
    } finally {
      submitting.value = false;
    }
  }

  async function onSubmitTransaction(payload) {
    submitting.value = true;
    try {
      await transactionsStore.createOne(payload);
      resetKey.value += 1;

      transactionsStore.setFilters({ page: 1 });

      await Promise.all([
        accountsStore.fetchAccounts({ force: true }),
        transactionsStore.fetchList({ page: 1 }),
      ]);
    } finally {
      submitting.value = false;
    }
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
