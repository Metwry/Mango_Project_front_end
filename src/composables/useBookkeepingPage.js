import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "@/utils/element";
import { useAccountsStore } from "@/stores/accounts";
import { useTransactionsStore } from "@/stores/transaction";
import { TRANSACTION_HISTORY_MODE } from "@/utils/transaction.js";

// 判断弹窗关闭结果是否属于用户主动取消。
function isCancelAction(error) {
  return error === "cancel" || error === "close";
}

// 提供记账页面所需的列表查询、提交和删除等交互逻辑。
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

  const HISTORY_MODES = new Set(Object.values(TRANSACTION_HISTORY_MODE));

  // 根据当前历史记录模式返回对应的中文名称。
  function currentModeLabel() {
    const mode = txFilters.value.history_mode;
    if (mode === TRANSACTION_HISTORY_MODE.ALL) return "投资记录";
    if (mode === TRANSACTION_HISTORY_MODE.TRANSFER) return "转账记录";
    if (mode === TRANSACTION_HISTORY_MODE.REVERSED) return "已撤销记录";
    return "活动记录";
  }

  // 切换分页页码并刷新列表。
  function onPageChange(page) {
    return transactionsStore.fetchList({ page });
  }

  // 切换每页条数并回到第一页重新查询。
  function onPageSizeChange(page_size) {
    return transactionsStore.fetchList({ page: 1, page_size });
  }

  // 根据新的搜索条件刷新列表，并重置到第一页。
  function onSearchChange(filters) {
    return transactionsStore.fetchList({ page: 1, ...filters });
  }

  // 重置搜索条件，同时保留当前分页大小和历史模式。
  function onSearchReset() {
    const currentPageSize = Number(txFilters.value.page_size) || 10;
    const currentMode = txFilters.value.history_mode;
    transactionsStore.resetFilters();
    return transactionsStore.fetchList({
      page: 1,
      page_size: currentPageSize,
      history_mode: currentMode,
    });
  }

  // 切换历史记录模式并刷新列表。
  function onModeChange(history_mode) {
    return transactionsStore.fetchList({
      page: 1,
      history_mode,
      counterparty: "",
      transfer_account_id: "",
    });
  }

  // 显示危险操作确认弹窗，并返回用户是否确认。
  async function confirmDanger(message) {
    try {
      await ElMessageBox.confirm(message, "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      });
      return true;
    } catch (e) {
      if (isCancelAction(e)) return false;
      throw e;
    }
  }

  // 在提交态包裹异步任务，统一维护 submitting 状态。
  async function withSubmitting(task) {
    submitting.value = true;
    try {
      return await task();
    } finally {
      submitting.value = false;
    }
  }

  // 撤销一条交易记录，并同步刷新账户数据。
  async function onReverseTransaction(id) {
    const confirmed = await confirmDanger("确定撤销该记录？将自动生成已撤销记录。");
    if (!confirmed) return;

    return withSubmitting(async () => {
      await transactionsStore.reverseOne(id);
      await accountsStore.fetchAccounts({ force: true });
      ElMessage.success("撤销成功");
    });
  }

  // 提交一条新的交易记录，并刷新账户和列表数据。
  async function onSubmitTransaction(payload) {
    return withSubmitting(async () => {
      await transactionsStore.createOne(payload);
      await Promise.all([
        accountsStore.fetchAccounts({ force: true }),
        transactionsStore.fetchList({ page: 1 }),
      ]);
    });
  }

  // 删除单条记录，只刷新交易列表，不刷新账户数据。
  async function onDeleteOne(id) {
    if (!id) return;

    const confirmed = await confirmDanger(`确定删除该${currentModeLabel()}？删除后无法恢复。`);
    if (!confirmed) return;

    deletingId.value = id;
    try {
      await transactionsStore.removeOne(id);
      ElMessage.success("删除成功");
    } finally {
      deletingId.value = null;
    }
  }

  // 删除当前模式下的全部记录，只刷新交易列表，不刷新账户数据。
  async function onDeleteAll() {
    const modeText = currentModeLabel();
    const confirmed = await confirmDanger(`确定删除全部${modeText}？该操作不可恢复。`);
    if (!confirmed) return;

    clearingAll.value = true;
    try {
      await transactionsStore.removeAllByCurrentMode();
      ElMessage.success(`已删除全部${modeText}`);
    } finally {
      clearingAll.value = false;
    }
  }

  onMounted(() => {
    const routeMode = String(route.query?.history_mode ?? route.query?.mode ?? "").trim().toLowerCase();
    const modeFromRoute = HISTORY_MODES.has(routeMode)
      ? routeMode
      : TRANSACTION_HISTORY_MODE.ACTIVITY;
    const currentPageSize = Number(txFilters.value.page_size) || 10;
    transactionsStore.resetFilters();
    return Promise.all([
      accountsStore.fetchAccounts(),
      transactionsStore.fetchList({
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
