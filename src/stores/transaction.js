import { defineStore } from "pinia";
import { ref, reactive, computed } from "vue";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  patchTransaction,
  deleteTransaction,
  reverseTransaction,
} from "@/utils/transaction.js";
import { getPagedList, getPayload } from "@/utils/apiPayload";

export const useTransactionsStore = defineStore("transactions", () => {
  const items = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref(null);

  const defaultFilters = () => ({
    account_id: null,
    counterparty: null,
    category: null,
    start: null,
    end: null,
    ordering: "-add_date",
    page: 1,
    page_size: 10,
  });

  const filters = reactive(defaultFilters());
  const detailMap = reactive({});

  const hasFilters = computed(() =>
    [
      filters.account_id,
      filters.counterparty,
      filters.category,
      filters.start,
      filters.end,
    ].some(Boolean),
  );

  function setFilters(patch) {
    Object.assign(filters, patch);
  }

  function resetFilters() {
    Object.assign(filters, defaultFilters());
  }

  async function fetchList(extraParams = {}) {
    loading.value = true;
    error.value = null;

    try {
      const params = { ...filters, ...extraParams };
      Object.keys(params).forEach((k) => {
        const v = params[k];
        if (v === null || v === undefined || v === "") delete params[k];
      });

      const res = await getTransactions(params);
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

  function refresh() {
    return fetchList();
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

  async function updateOne(id, payload) {
    error.value = null;
    try {
      const res = await updateTransaction(id, payload);
      const data = getPayload(res);
      if (data) detailMap[id] = data;
      await refresh();
      return data;
    } catch (e) {
      error.value = e;
      throw e;
    }
  }

  async function patchOne(id, patch) {
    error.value = null;
    try {
      const res = await patchTransaction(id, patch);
      const data = getPayload(res);
      if (data) detailMap[id] = data;
      await refresh();
      return data;
    } catch (e) {
      error.value = e;
      throw e;
    }
  }

  async function removeOne(id) {
    error.value = null;
    try {
      await deleteTransaction(id);
      delete detailMap[id];
      await refresh();
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

      await fetchList({ page: filters.page, page_size: filters.page_size });

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

    Object.assign(filters, defaultFilters());
    Object.keys(detailMap).forEach((k) => delete detailMap[k]);
  }

  return {
    items,
    total,
    loading,
    error,
    filters,
    detailMap,
    hasFilters,

    setFilters,
    resetFilters,
    fetchList,
    refresh,
    createOne,
    updateOne,
    patchOne,
    removeOne,
    reverseOne,
    reset,
  };
});
