import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { ElMessage, ElMessageBox } from "element-plus";
import { useAccountsStore } from "@/stores/accounts";
import { useTransactionsStore } from "@/stores/transaction";
import { TRANSACTION_HISTORY_MODE } from "@/utils/transaction.js";

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
  const deletingId = ref(null);
  const clearingAll = ref(false);

  function currentModeLabel() {
    const mode = txFilters.value?.history_mode;
    if (mode === TRANSACTION_HISTORY_MODE.ALL) return "交易记录";
    if (mode === TRANSACTION_HISTORY_MODE.REVERSED) return "已撤销记录";
    return "活动记录";
  }

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
    const currentMode = txFilters.value?.history_mode || TRANSACTION_HISTORY_MODE.ACTIVITY;
    transactionsStore.resetFilters();
    return updateAndFetch({
      page: 1,
      page_size: currentPageSize,
      history_mode: currentMode,
    });
  }

  function onModeChange(history_mode) {
    return updateAndFetch({ page: 1, history_mode });
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
    try {
      await ElMessageBox.confirm("确定撤销该记录？将自动生成已撤销记录。", "提示", {
        type: "warning",
      });
    } catch (e) {
      if (e === "cancel" || e === "close") return;
      throw e;
    }

    return withSubmitting(async () => {
      await transactionsStore.reverseOne(id);
      await accountsStore.fetchAccounts({ force: true });
      ElMessage.success("撤销成功");
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

  async function onDeleteOne(id) {
    if (!id) return;
    const modeText = currentModeLabel();

    try {
      await ElMessageBox.confirm(`确定删除该${modeText}？删除后无法恢复。`, "提示", {
        type: "warning",
      });
    } catch (e) {
      if (e === "cancel" || e === "close") return;
      throw e;
    }

    deletingId.value = id;
    try {
      await transactionsStore.removeOne(id);
      await accountsStore.fetchAccounts({ force: true });
      ElMessage.success("删除成功");
    } finally {
      deletingId.value = null;
    }
  }

  async function onDeleteAll() {
    const modeText = currentModeLabel();
    try {
      await ElMessageBox.confirm(`确定删除全部${modeText}？该操作不可恢复。`, "提示", {
        type: "warning",
      });
    } catch (e) {
      if (e === "cancel" || e === "close") return;
      throw e;
    }

    clearingAll.value = true;
    try {
      await transactionsStore.removeAllByCurrentMode();
      await accountsStore.fetchAccounts({ force: true });
      ElMessage.success(`已删除全部${modeText}`);
    } finally {
      clearingAll.value = false;
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
    onModeChange,
    onDeleteOne,
    onDeleteAll,
    onSubmitTransaction,
    resetKey,
    deletingId,
    clearingAll,
    submitting,
    transactions,
    transactionsError,
    transactionsLoading,
    transactionsTotal,
    txFilters,
  };
}
