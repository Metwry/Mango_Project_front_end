import { defineStore } from "pinia";
import { ref, reactive, computed } from "vue";
import {
  getAccounts,
  createAccount as apiCreateAccount,
  updateAccount as apiUpdateAccount,
  deleteAccount as apiDeleteAccount,
  getAccountDetail,
} from "@/utils/accounts";

export const useAccountsStore = defineStore("accounts", () => {
  // ===== state =====
  const accounts = ref([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref(null);

  const fetched = ref(false);
  const lastFetchedAt = ref(null);

  // 用于并发去重/保证强制刷新
  const fetchPromise = ref(null);

  // 可选：详情缓存
  const detailMap = reactive({}); // { [id]: accountDetail }

  // ===== getters =====
  const byId = computed(() => (id) => accounts.value.find((a) => a.id === id));

  // ===== actions =====
  /**
   * 拉取账户列表
   * - 非 force：若已有请求在跑，则复用；若已 fetched 则不重复拉
   * - force：保证一定会再发一次请求（即使当前有请求在跑）
   */
  async function fetchAccounts({ force = false } = {}) {
    // 非 force：如果已经拉过并且不强制刷新，直接返回
    if (fetched.value && !force) return accounts.value;

    // 非 force：如果已有请求在跑，复用这个请求
    if (fetchPromise.value && !force) return fetchPromise.value;

    // force：如果已有请求在跑，先等它结束，然后再发一次新的
    if (fetchPromise.value && force) {
      try {
        await fetchPromise.value;
      } catch {
        // 前一个请求失败也无所谓，继续强制再拉一次
      }
    }

    loading.value = true;
    error.value = null;

    const p = (async () => {
      try {
        const res = await getAccounts();
        const payload = res?.data;

        const list = Array.isArray(payload)
          ? payload
          : (payload?.results ?? []);
        accounts.value = list;

        fetched.value = true;
        lastFetchedAt.value = Date.now();

        return accounts.value;
      } catch (e) {
        error.value = e;
        throw e;
      } finally {
        loading.value = false;
        fetchPromise.value = null;
      }
    })();

    fetchPromise.value = p;
    return p;
  }

  function refreshAccounts() {
    return fetchAccounts({ force: true });
  }

  async function createAccount(payload) {
    saving.value = true;
    error.value = null;

    try {
      const res = await apiCreateAccount(payload);
      // 以数据库为准：强制刷新列表
      await fetchAccounts({ force: true });
      return res?.data;
    } catch (e) {
      error.value = e;
      throw e;
    } finally {
      saving.value = false;
    }
  }

  async function updateAccount(id, payload) {
    saving.value = true;
    error.value = null;

    try {
      const res = await apiUpdateAccount(id, payload);
      // 更新详情缓存（可选）
      if (res?.data) detailMap[id] = res.data;

      await fetchAccounts({ force: true });
      return res?.data;
    } catch (e) {
      error.value = e;
      throw e;
    } finally {
      saving.value = false;
    }
  }

  async function deleteAccount(id) {
    saving.value = true;
    error.value = null;

    try {
      await apiDeleteAccount(id);
      delete detailMap[id];

      await fetchAccounts({ force: true });
    } catch (e) {
      error.value = e;
      throw e;
    } finally {
      saving.value = false;
    }
  }

  async function fetchAccountDetail(id, { useCache = true } = {}) {
    if (useCache && detailMap[id]) return detailMap[id];

    error.value = null;
    try {
      const res = await getAccountDetail(id);
      const detail = res?.data;
      if (detail) detailMap[id] = detail;
      return detail;
    } catch (e) {
      error.value = e;
      throw e;
    }
  }

  return {
    // state
    accounts,
    loading,
    saving,
    error,
    fetched,
    lastFetchedAt,
    detailMap,

    // getters
    byId,

    // actions
    fetchAccounts,
    refreshAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    fetchAccountDetail,
  };
});
