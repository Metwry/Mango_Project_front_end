import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { useAccountsStore } from "@/stores/accounts";
import { useTransactionsStore } from "@/stores/transaction";
import { TRANSACTION_HISTORY_MODE } from "@/utils/transaction.js";

function isCancelAction(error) {
  return error === "cancel" || error === "close";
}

export function useBookkeepingPage() {
  const route = useRoute();
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
  const deletingId = ref(null);
  const clearingAll = ref(false);

  function normalizeHistoryMode(raw) {
    const mode = String(raw ?? "").trim().toLowerCase();
    if (mode === TRANSACTION_HISTORY_MODE.ALL) return TRANSACTION_HISTORY_MODE.ALL;
    if (mode === TRANSACTION_HISTORY_MODE.TRANSFER) return TRANSACTION_HISTORY_MODE.TRANSFER;
    if (mode === TRANSACTION_HISTORY_MODE.REVERSED) return TRANSACTION_HISTORY_MODE.REVERSED;
    return TRANSACTION_HISTORY_MODE.ACTIVITY;
  }

  function currentModeLabel() {
    const mode = txFilters.value?.history_mode;
    if (mode === TRANSACTION_HISTORY_MODE.ALL) return "交易记录";
    if (mode === TRANSACTION_HISTORY_MODE.TRANSFER) return "转账记录";
    if (mode === TRANSACTION_HISTORY_MODE.REVERSED) return "已撤销记录";
    return "活动记录";
  }

  function updateAndFetch(patch = {}) {
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

  async function confirmDanger(message) {
    try {
      await ElMessageBox.confirm(message, "提示", { type: "warning" });
      return true;
    } catch (e) {
      if (isCancelAction(e)) return false;
      throw e;
    }
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
    const confirmed = await confirmDanger("确定撤销该记录？将自动生成已撤销记录。");
    if (!confirmed) return;

    return withSubmitting(async () => {
      await transactionsStore.reverseOne(id);
      await accountsStore.fetchAccounts({ force: true });
      ElMessage.success("撤销成功");
    });
  }

  async function onSubmitTransaction(payload) {
    return withSubmitting(async () => {
      await transactionsStore.createOne(payload);
      await Promise.all([
        accountsStore.fetchAccounts({ force: true }),
        updateAndFetch({ page: 1 }),
      ]);
    });
  }

  async function onDeleteOne(id) {
    if (!id) return;

    const confirmed = await confirmDanger(`确定删除该${currentModeLabel()}？删除后无法恢复。`);
    if (!confirmed) return;

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
    const confirmed = await confirmDanger(`确定删除全部${modeText}？该操作不可恢复。`);
    if (!confirmed) return;

    clearingAll.value = true;
    try {
      await transactionsStore.removeAllByCurrentMode();
      await accountsStore.fetchAccounts({ force: true });
      ElMessage.success(`已删除全部${modeText}`);
    } finally {
      clearingAll.value = false;
    }
  }

  onMounted(() => {
    const modeFromRoute = normalizeHistoryMode(route.query?.history_mode ?? route.query?.mode);
    const currentPageSize = Number(txFilters.value?.page_size) || 10;
    transactionsStore.resetFilters();
    return Promise.all([
      accountsStore.fetchAccounts(),
      updateAndFetch({
        page: 1,
        page_size: currentPageSize,
        history_mode: modeFromRoute,
      }),
    ]);
  });

  return {
    accounts,
    accountsError,
    accountsLoading,
    onDeleteAll,
    onDeleteOne,
    onModeChange,
    onPageChange,
    onPageSizeChange,
    onReverseTransaction,
    onSearchChange,
    onSearchReset,
    onSubmitTransaction,
    clearingAll,
    deletingId,
    submitting,
    transactions,
    transactionsError,
    transactionsLoading,
    transactionsTotal,
    txFilters,
  };
}
