import { defineStore } from "pinia";
import {
  getAccounts,
  createAccount as apiCreateAccount,
  updateAccount as apiUpdateAccount,
  deleteAccount as apiDeleteAccount,
  getAccountDetail,
} from "@/utils/accounts";

export const useAccountsStore = defineStore("accounts", {
  state: () => ({
    accounts: [],
    loading: false,
    saving: false,
    error: null,

    fetched: false,
    lastFetchedAt: null,

    // 用于并发去重/保证强制刷新
    _fetchPromise: null,

    // 可选：详情缓存
    detailMap: {}, // { [id]: accountDetail }
  }),

  getters: {
    byId: (state) => (id) => state.accounts.find((a) => a.id === id),
  },

  actions: {
    /**
     * 拉取账户列表
     * - 非 force：若已有请求在跑，则复用；若已 fetched 则不重复拉
     * - force：保证一定会再发一次请求（即使当前有请求在跑）
     */
    async fetchAccounts({ force = false } = {}) {
      // 非 force：如果已经拉过并且不强制刷新，直接返回
      if (this.fetched && !force) return this.accounts;

      // 非 force：如果已有请求在跑，复用这个请求
      if (this._fetchPromise && !force) return this._fetchPromise;

      // force：如果已有请求在跑，先等它结束，然后再发一次新的
      if (this._fetchPromise && force) {
        try {
          await this._fetchPromise;
        } catch {
          // 前一个请求失败也无所谓，继续强制再拉一次
        }
      }

      this.loading = true;
      this.error = null;

      const p = (async () => {
        try {
          const res = await getAccounts();
          const payload = res?.data;

          const list = Array.isArray(payload)
            ? payload
            : (payload?.results ?? []);
          this.accounts = list;

          this.fetched = true;
          this.lastFetchedAt = Date.now();

          return this.accounts;
        } catch (e) {
          this.error = e;
          throw e;
        } finally {
          this.loading = false;
          this._fetchPromise = null;
        }
      })();

      this._fetchPromise = p;
      return p;
    },

    async refreshAccounts() {
      return this.fetchAccounts({ force: true });
    },

    async createAccount(payload) {
      this.saving = true;
      this.error = null;

      try {
        const res = await apiCreateAccount(payload);
        // 以数据库为准：强制刷新列表
        await this.fetchAccounts({ force: true });
        return res?.data;
      } catch (e) {
        this.error = e;
        throw e;
      } finally {
        this.saving = false;
      }
    },

    async updateAccount(id, payload) {
      this.saving = true;
      this.error = null;

      try {
        const res = await apiUpdateAccount(id, payload);
        // 更新详情缓存（可选）
        if (res?.data) this.detailMap[id] = res.data;

        await this.fetchAccounts({ force: true });
        return res?.data;
      } catch (e) {
        this.error = e;
        throw e;
      } finally {
        this.saving = false;
      }
    },

    async deleteAccount(id) {
      this.saving = true;
      this.error = null;

      try {
        await apiDeleteAccount(id);
        delete this.detailMap[id];

        await this.fetchAccounts({ force: true });
      } catch (e) {
        this.error = e;
        throw e;
      } finally {
        this.saving = false;
      }
    },

    async fetchAccountDetail(id, { useCache = true } = {}) {
      if (useCache && this.detailMap[id]) return this.detailMap[id];

      this.error = null;
      try {
        const res = await getAccountDetail(id);
        const detail = res?.data;
        if (detail) this.detailMap[id] = detail;
        return detail;
      } catch (e) {
        this.error = e;
        throw e;
      }
    },
  },
});
