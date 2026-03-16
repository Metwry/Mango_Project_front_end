import { defineStore } from "pinia";
import { reactive, ref } from "vue";
import {
  createTransaction,
  deleteTransactions,
  getSourceByMode,
  getTransactionsByMode,
  reverseTransaction,
  TRANSACTION_HISTORY_MODE,
} from "@/utils/transaction.js";

// 创建交易列表的默认筛选条件。
function createDefaultFilters() {
  return {
    account_id: null,
    transfer_account_id: null,
    counterparty: null,
    category: null,
    start: null,
    end: null,
    ordering: "-add_date",
    history_mode: TRANSACTION_HISTORY_MODE.ACTIVITY,
    page: 1,
    page_size: 10,
  };
}

// 清理查询参数中的空值，避免无效参数传给接口。
function sanitizeParams(params) {
  const next = { ...params };
  Object.keys(next).forEach((key) => {
    const value = next[key];
    if (value === null || value === undefined || value === "") {
      delete next[key];
    }
  });
  return next;
}

// 管理交易列表、筛选条件以及增删改查操作。
export const useTransactionsStore = defineStore("transactions", () => {
  const items = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref(null);
  const filters = reactive(createDefaultFilters());

  // 将筛选条件恢复为默认值。
  function resetFilters() {
    Object.assign(filters, createDefaultFilters());
  }

  // 按当前筛选条件拉取交易列表。
  async function fetchList(patch = {}) {
    loading.value = true;
    error.value = null;

    try {
      Object.assign(filters, patch);
      const params = sanitizeParams({ ...filters });
      const historyMode = params.history_mode || TRANSACTION_HISTORY_MODE.ACTIVITY;
      delete params.history_mode;

      const res = await getTransactionsByMode(historyMode, params);
      items.value = Array.isArray(res.data?.results) ? res.data.results : [];
      total.value = Number(res.data?.count ?? items.value.length) || 0;
      return items.value;
    } catch (e) {
      error.value = e;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  // 创建一条新的交易记录。
  async function createOne(payload) {
    error.value = null;
    try {
      const res = await createTransaction(payload);
      return res.data;
    } catch (e) {
      error.value = e;
      throw e;
    }
  }

  // 删除单条交易记录，并在必要时回退到上一页。
  async function removeOne(id) {
    error.value = null;
    try {
      await deleteTransactions({ id });

      const currentPage = Number(filters.page) || 1;
      await fetchList({
        page: currentPage,
        page_size: filters.page_size,
        history_mode: filters.history_mode,
      });

      if (currentPage > 1 && items.value.length === 0) {
        await fetchList({
          page: currentPage - 1,
          page_size: filters.page_size,
          history_mode: filters.history_mode,
        });
      }
    } catch (e) {
      error.value = e;
      throw e;
    }
  }

  // 删除当前模式下的全部交易记录。
  async function removeAllByCurrentMode() {
    error.value = null;
    try {
      await deleteTransactions({ source: getSourceByMode(filters.history_mode) });
      await fetchList({
        page: 1,
        page_size: filters.page_size,
        history_mode: filters.history_mode,
      });
    } catch (e) {
      error.value = e;
      throw e;
    }
  }

  // 撤销一条交易记录并刷新当前列表。
  async function reverseOne(id) {
    error.value = null;
    try {
      const res = await reverseTransaction(id);
      const data = res.data;
      await fetchList({
        page: filters.page,
        page_size: filters.page_size,
        history_mode: filters.history_mode,
      });
      return data;
    } catch (e) {
      error.value = e;
      throw e;
    }
  }

  // 重置交易 store 的全部状态。
  function reset() {
    items.value = [];
    total.value = 0;
    loading.value = false;
    error.value = null;
    Object.assign(filters, createDefaultFilters());
  }

  return {
    items,
    total,
    loading,
    error,
    filters,
    resetFilters,
    fetchList,
    createOne,
    removeOne,
    reverseOne,
    removeAllByCurrentMode,
    reset,
  };
});
