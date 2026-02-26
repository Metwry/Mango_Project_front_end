import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import {
  getAccounts,
  createAccount as apiCreateAccount,
  updateAccount as apiUpdateAccount,
  deleteAccount as apiDeleteAccount,
  getAccountDetail,
} from "@/utils/accounts";
import { getMsToNextMinuteTick } from "@/utils/refreshScheduler";

const AUTO_REFRESH_INTERVAL_MINUTES = 10;
const AUTO_REFRESH_SECOND = 5;

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
  let autoRefreshTimer = null;

  function clearAutoRefreshTimer() {
    if (!autoRefreshTimer) return;
    clearTimeout(autoRefreshTimer);
    autoRefreshTimer = null;
  }

  function scheduleNextAutoRefresh() {
    clearAutoRefreshTimer();
    autoRefreshTimer = setTimeout(async () => {
      try {
        await fetchAccounts({ force: true });
      } catch {
        // Keep scheduler alive even when one refresh fails.
      }

      scheduleNextAutoRefresh();
    }, getMsToNextMinuteTick({
      intervalMinutes: AUTO_REFRESH_INTERVAL_MINUTES,
      second: AUTO_REFRESH_SECOND,
    }));
  }

  function startAccountsAutoRefresh() {
    scheduleNextAutoRefresh();
  }

  function stopAccountsAutoRefresh() {
    clearAutoRefreshTimer();
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
        const payload = res?.data ?? res;
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
    actionError.value = null;
    try {
      const res = await apiCreateAccount(payload);
      await refreshAccounts();
      return res?.data ?? res;
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
      const data = res?.data ?? res;
      if (data) detailMap[id] = data;

      await refreshAccounts();
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
      const detail = res?.data ?? res;
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
