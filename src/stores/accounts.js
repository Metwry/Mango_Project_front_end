import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import {
  getAccounts,
  createAccount as apiCreateAccount,
  updateAccount as apiUpdateAccount,
  deleteAccount as apiDeleteAccount,
  getAccountDetail,
} from "@/utils/accounts";
import { getPayload } from "@/utils/api";
import { createMinuteAlignedScheduler } from "@/utils/refreshScheduler";
import { AUTO_REFRESH_ENABLED, STORE_REFRESH_CONFIG } from "@/config/Config";

const AUTO_REFRESH_INTERVAL_MINUTES = STORE_REFRESH_CONFIG.accounts.intervalMinutes;
const AUTO_REFRESH_SECOND = STORE_REFRESH_CONFIG.accounts.second;

export const useAccountsStore = defineStore("accounts", () => {
  // ===== state =====
  const accounts = ref([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref(null);
  const actionError = ref(null);

  const fetched = ref(false);
  const lastFetchedAt = ref(null);

  const fetchPromise = ref(null);
  const detailMap = reactive({});
  const autoRefreshScheduler = createMinuteAlignedScheduler({
    intervalMinutes: AUTO_REFRESH_INTERVAL_MINUTES,
    second: AUTO_REFRESH_SECOND,
    task: async () => {
      await fetchAccounts({ force: true });
    },
    onError: () => {
      // Keep scheduler alive even when one refresh fails.
    },
  });

  function startAccountsAutoRefresh() {
    if (!AUTO_REFRESH_ENABLED) return;
    autoRefreshScheduler.start();
  }

  function stopAccountsAutoRefresh() {
    autoRefreshScheduler.stop();
  }

  // ===== actions =====
  async function fetchAccounts({ force = false } = {}) {
    if (fetched.value && !force) return accounts.value;
    if (fetchPromise.value && !force) return fetchPromise.value;

    if (fetchPromise.value && force) {
      try {
        await fetchPromise.value;
      } catch {}
    }

    loading.value = true;
    error.value = null;

    const p = (async () => {
      try {
        const res = await getAccounts();
        accounts.value = getPayload(res, []);

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
    actionError.value = null;
    try {
      const res = await apiCreateAccount(payload);
      await refreshAccounts();
      return getPayload(res);
    } catch (e) {
      actionError.value = e;
      throw e;
    } finally {
      saving.value = false;
    }
  }

  async function updateAccount(id, payload) {
    saving.value = true;
    actionError.value = null;
    try {
      const res = await apiUpdateAccount(id, payload);
      const data = getPayload(res);
      if (data) {
        const index = accounts.value.findIndex((item) => item.id === id);
        if (index !== -1) {
          accounts.value[index] = {
            ...accounts.value[index],
            ...data,
          };
        }
        detailMap[id] = {
          ...(detailMap[id] || {}),
          ...data,
        };
        fetched.value = true;
        lastFetchedAt.value = Date.now();
      }

      return data;
    } catch (e) {
      actionError.value = e;
      throw e;
    } finally {
      saving.value = false;
    }
  }

  async function deleteAccount(id) {
    saving.value = true;
    actionError.value = null;
    try {
      await apiDeleteAccount(id);
      delete detailMap[id];
      await refreshAccounts();
    } catch (e) {
      actionError.value = e;
      console.log(e);
      throw e;
    } finally {
      saving.value = false;
    }
  }

  async function fetchAccountDetail(id, { useCache = true } = {}) {
    if (useCache && detailMap[id]) return detailMap[id];

    actionError.value = null;
    try {
      const res = await getAccountDetail(id);
      const detail = getPayload(res);
      if (detail) detailMap[id] = detail;
      return detail;
    } catch (e) {
      actionError.value = e;
      throw e;
    }
  }

  function reset() {
    stopAccountsAutoRefresh();

    accounts.value = [];
    loading.value = false;
    saving.value = false;
    error.value = null;
    actionError.value = null;

    fetched.value = false;
    lastFetchedAt.value = null;

    fetchPromise.value = null;

    Object.keys(detailMap).forEach((k) => delete detailMap[k]);
  }

  return {
    accounts,
    loading,
    saving,
    error,
    actionError,
    fetched,
    lastFetchedAt,
    detailMap,

    fetchAccounts,
    refreshAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    fetchAccountDetail,
    startAccountsAutoRefresh,
    stopAccountsAutoRefresh,

    reset,
  };
});

