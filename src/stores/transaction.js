import { defineStore } from "pinia";
import { reactive, ref } from "vue";
import { getPagedList, getPayload } from "@/utils/api";
import {
  createTransaction,
  deleteAllTransactionsByActivity,
  deleteTransactionByMode,
  getActivityTypeByMode,
  getTransactionsByMode,
  reverseTransaction,
  TRANSACTION_HISTORY_MODE,
} from "@/utils/transaction.js";

function createDefaultFilters() {
  return {
    account_id: null,
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

export const useTransactionsStore = defineStore("transactions", () => {
  const items = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref(null);
  const filters = reactive(createDefaultFilters());

  function setFilters(patch = {}) {
    Object.assign(filters, patch);
  }

  function resetFilters() {
    Object.assign(filters, createDefaultFilters());
  }

  async function fetchList(extraParams = {}) {
    loading.value = true;
    error.value = null;

    try {
      const params = sanitizeParams({ ...filters, ...extraParams });
      const historyMode = params.history_mode || TRANSACTION_HISTORY_MODE.ACTIVITY;
      delete params.history_mode;

      const res = await getTransactionsByMode(historyMode, params);
      const normalized = getPagedList(res);
      items.value = normalized.list;
      total.value = normalized.total;
      return items.value;
    } catch (e) {
      error.value = e;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function createOne(payload) {
    error.value = null;
    try {
      const res = await createTransaction(payload);
      return getPayload(res);
    } catch (e) {
      error.value = e;
      throw e;
    }
  }

  async function removeOne(id) {
    error.value = null;
    try {
      await deleteTransactionByMode(id);

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

  async function removeAllByCurrentMode() {
    error.value = null;
    try {
      const activityType = getActivityTypeByMode(filters.history_mode);
      await deleteAllTransactionsByActivity(activityType);
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

  async function reverseOne(id) {
    error.value = null;
    try {
      const res = await reverseTransaction(id);
      const data = getPayload(res);
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
    setFilters,
    resetFilters,
    fetchList,
    createOne,
    removeOne,
    reverseOne,
    removeAllByCurrentMode,
    reset,
  };
});
