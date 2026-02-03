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

  const fetchPromise = ref(null);
  const detailMap = reactive({});

  // ===== getters =====
  const byId = computed(() => (id) => accounts.value.find((a) => a.id === id));

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
    error.value = null;
    try {
      const res = await apiCreateAccount(payload);
      await refreshAccounts();
      return res?.data ?? res;
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
      const data = res?.data ?? res;
      if (data) detailMap[id] = data;

      await refreshAccounts();
      return data;
    } catch (e) {
      error.value = e;
      throw e;
    } finally {
      saving.value = false;
    }
  }

  async function deleteAccount(id) {
    saving.value = true;
    try {
      await apiDeleteAccount(id);
      delete detailMap[id];
      await refreshAccounts();
    } catch (e) {
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
      const detail = res?.data ?? res;
      if (detail) detailMap[id] = detail;
      return detail;
    } catch (e) {
      error.value = e;
      throw e;
    }
  }

  function reset() {
    accounts.value = [];
    loading.value = false;
    saving.value = false;
    error.value = null;

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
    fetched,
    lastFetchedAt,
    detailMap,

    byId,

    fetchAccounts,
    refreshAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    fetchAccountDetail,

    reset,
  };
});
