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
  // ===== state =====
  const items = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref(null);

  // filters：跨组件共享的筛选/分页状态
  const defaultFilters = () => ({
    account_id: null,
    category: null,
    start: null, // YYYY-MM-DD
    end: null, // YYYY-MM-DD
    search: "",
    ordering: "-date",
    page: 1,
    page_size: 20,
  });

  const filters = reactive(defaultFilters());

  // 详情缓存
  const detailMap = reactive({}); // { [id]: transaction }

  // ===== getters (computed) =====
  const hasFilters = computed(() => {
    return !!(
      filters.account_id ||
      filters.category ||
      filters.start ||
      filters.end ||
      filters.search
    );
  });

  // ===== actions =====
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
      // 合并 filters + extraParams（extraParams 优先）
      const params = { ...filters, ...extraParams };

      // 清理空值，避免传 null/空字符串
      Object.keys(params).forEach((k) => {
        const v = params[k];
        if (v === null || v === undefined || v === "") delete params[k];
      });

      const res = await getTransactions(params);

      // 兼容 DRF 常见分页格式：{ count, results }
      if (res?.results) {
        items.value = res.results;
        total.value = res.count ?? res.results.length;
      } else {
        // 非分页：直接数组
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        items.value = list;
        total.value = list.length;
      }

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
      detailMap[id] = res;
      return res;
    } catch (e) {
      error.value = e;
      throw e;
    }
  }

  async function createOne(payload) {
    error.value = null;
    try {
      const res = await createTransaction(payload);
      // await refresh();
      return res;
    } catch (e) {
      error.value = e;
      throw e;
    }
  }

  async function updateOne(id, payload) {
    error.value = null;
    try {
      const res = await updateTransaction(id, payload);
      detailMap[id] = res;
      await refresh();
      return res;
    } catch (e) {
      error.value = e;
      throw e;
    }
  }

  async function patchOne(id, patch) {
    error.value = null;
    try {
      const res = await patchTransaction(id, patch);
      detailMap[id] = res;
      await refresh();
      return res;
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

  // expose
  return {
    // state
    items,
    total,
    loading,
    error,
    filters,
    detailMap,

    // getters
    hasFilters,

    // actions
    setFilters,
    resetFilters,
    fetchList,
    refresh,
    fetchDetail,
    createOne,
    updateOne,
    patchOne,
    removeOne,
  };
});
