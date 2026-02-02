import { defineStore } from "pinia";
import { ref, reactive, computed } from "vue";
import {
  getTransactions,
  createTransaction,
  getTransactionDetail,
  updateTransaction,
  patchTransaction,
  deleteTransaction,
} from "@/utils/transaction.js";

export const useTransactionsStore = defineStore("transactions", () => {
  const items = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref(null);

  const defaultFilters = () => ({
    account_id: null,
    category: null,
    start: null,
    end: null,
    search: "",
    ordering: "-created_at", // ✅ 原来 -date，后端没有这个字段就会无效
    page: 1,
    page_size: 20,
  });

  const filters = reactive(defaultFilters());
  const detailMap = reactive({});

  const hasFilters = computed(() => {
    return !!(
      filters.account_id ||
      filters.category ||
      filters.start ||
      filters.end ||
      filters.search
    );
  });

  function setFilters(patch) {
    Object.assign(filters, patch);
  }

  function resetFilters() {
    Object.assign(filters, defaultFilters());
  }

  function normalizeListPayload(payload) {
    if (payload && Array.isArray(payload.results)) {
      return {
        list: payload.results,
        total: payload.count ?? payload.results.length,
      };
    }
    if (Array.isArray(payload)) return { list: payload, total: payload.length };
    return { list: [], total: 0 };
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
      const payload = res?.data ?? res; // ✅ 兼容 utils 返回 data/response

      const normalized = normalizeListPayload(payload);
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

  async function fetchDetail(id, { useCache = true } = {}) {
    if (useCache && detailMap[id]) return detailMap[id];

    error.value = null;
    try {
      const res = await getTransactionDetail(id);
      const payload = res?.data ?? res;
      if (payload) detailMap[id] = payload;
      return payload;
    } catch (e) {
      error.value = e;
      throw e;
    }
  }

  async function createOne(payload) {
    error.value = null;
    try {
      const res = await createTransaction(payload);
      // 这里你现在不 refresh，是合理的（列表接口不稳时避免中断）
      return res?.data ?? res;
    } catch (e) {
      error.value = e;
      throw e;
    }
  }

  async function updateOne(id, payload) {
    error.value = null;
    try {
      const res = await updateTransaction(id, payload);
      const data = res?.data ?? res;
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
      const data = res?.data ?? res;
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

  // ✅ logout/切用户时用：清空交易相关状态
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
    fetchDetail,
    createOne,
    updateOne,
    patchOne,
    removeOne,

    reset, // ✅
  };
});
