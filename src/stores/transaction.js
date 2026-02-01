import { defineStore } from "pinia";
import {
  getTransactions,
  createTransaction,
  getTransactionDetail,
  updateTransaction,
  patchTransaction,
  deleteTransaction,
} from "@/utils/transaction.js";

export const useTransactionsStore = defineStore("transactions", {
  state: () => ({
    items: [],
    total: 0, // 如果后端返回 count/total，可用
    loading: false,
    error: null,

    // 只放“跨组件共享”的筛选/分页状态；表单数据别放这里
    filters: {
      account_id: null,
      category: null,
      start: null, // YYYY-MM-DD
      end: null, // YYYY-MM-DD
      search: "", // 可选
      ordering: "-date", // 可选：如 "-date" / "date"
      page: 1,
      page_size: 20,
    },

    // 详情缓存（可选）
    detailMap: {}, // { [id]: transaction }
  }),

  getters: {
    hasFilters(state) {
      const f = state.filters;
      return !!(f.account_id || f.category || f.start || f.end || f.search);
    },
  },

  actions: {
    setFilters(patch) {
      this.filters = { ...this.filters, ...patch };
    },

    resetFilters() {
      this.filters = {
        account_id: null,
        category: null,
        start: null,
        end: null,
        search: "",
        ordering: "-date",
        page: 1,
        page_size: 20,
      };
    },

    async fetchList(extraParams = {}) {
      this.loading = true;
      this.error = null;

      try {
        // 合并 filters + extraParams（extraParams 优先）
        const params = { ...this.filters, ...extraParams };

        // 清理空值，避免传 null/空字符串
        Object.keys(params).forEach((k) => {
          const v = params[k];
          if (v === null || v === undefined || v === "") delete params[k];
        });

        const res = await getTransactions(params);

        // 兼容 DRF 常见分页格式：{ count, results }
        if (res?.results) {
          this.items = res.results;
          this.total = res.count ?? res.results.length;
        } else {
          // 非分页：直接数组
          this.items = Array.isArray(res) ? res : (res?.data ?? []);
          this.total = this.items.length;
        }

        return this.items;
      } catch (e) {
        this.error = e;
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async refresh() {
      return this.fetchList();
    },

    async fetchDetail(id, { useCache = true } = {}) {
      if (useCache && this.detailMap[id]) return this.detailMap[id];

      this.error = null;
      try {
        const res = await getTransactionDetail(id);
        this.detailMap[id] = res;
        return res;
      } catch (e) {
        this.error = e;
        throw e;
      }
    },

    async createOne(payload) {
      this.error = null;
      try {
        const res = await createTransaction(payload);
        // 简单做法：创建后刷新列表，保证与后端一致
        await this.refresh();
        return res;
      } catch (e) {
        this.error = e;
        throw e;
      }
    },

    async updateOne(id, payload) {
      this.error = null;
      try {
        const res = await updateTransaction(id, payload);
        // 更新缓存
        this.detailMap[id] = res;
        await this.refresh();
        return res;
      } catch (e) {
        this.error = e;
        throw e;
      }
    },

    async patchOne(id, patch) {
      this.error = null;
      try {
        const res = await patchTransaction(id, patch);
        this.detailMap[id] = res;
        await this.refresh();
        return res;
      } catch (e) {
        this.error = e;
        throw e;
      }
    },

    async removeOne(id) {
      this.error = null;
      try {
        await deleteTransaction(id);
        delete this.detailMap[id];
        await this.refresh();
      } catch (e) {
        this.error = e;
        throw e;
      }
    },
  },
});
