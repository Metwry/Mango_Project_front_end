import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import {
  getAccounts,
  createAccount as apiCreateAccount,
  updateAccount as apiUpdateAccount,
  deleteAccount as apiDeleteAccount,
  getAccountDetail,
} from "@/utils/accounts";
import { createMinuteAlignedScheduler } from "@/utils/refreshScheduler";
import { AUTO_REFRESH_ENABLED, STORE_REFRESH_CONFIG } from "@/config/Config";

const AUTO_REFRESH_INTERVAL_MINUTES = STORE_REFRESH_CONFIG.accounts.intervalMinutes;
const AUTO_REFRESH_SECOND = STORE_REFRESH_CONFIG.accounts.second;

// 管理账户列表、账户详情以及自动刷新逻辑。
export const useAccountsStore = defineStore("accounts", () => {
  // ===== state =====
  const accounts = ref([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref(null);

  const fetched = ref(false);

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

  // 启动账户列表的自动刷新调度器。
  function startAccountsAutoRefresh() {
    if (!AUTO_REFRESH_ENABLED) return;
    autoRefreshScheduler.start();
  }

  // 停止账户列表的自动刷新调度器。
  function stopAccountsAutoRefresh() {
    autoRefreshScheduler.stop();
  }

  // ===== actions =====
  // 拉取账户列表，并支持缓存复用与强制刷新。
  async function fetchAccounts({ force = false } = {}) {
    if (fetchPromise.value) return fetchPromise.value;
    if (fetched.value && !force) return accounts.value;

    loading.value = true;
    error.value = null;

    const p = (async () => {
      try {
        const res = await getAccounts();
        accounts.value = Array.isArray(res.data) ? res.data : [];

        fetched.value = true;

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

  // 创建账户并在成功后刷新列表。
  async function createAccount(payload) {
    saving.value = true;
    try {
      const res = await apiCreateAccount(payload);
      await fetchAccounts({ force: true });
      return res.data;
    } finally {
      saving.value = false;
    }
  }

  // 更新账户信息，并同步本地列表和详情缓存。
  async function updateAccount(id, payload) {
    saving.value = true;
    try {
      const res = await apiUpdateAccount(id, payload);
      const data = res.data;
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
      }

      return data;
    } finally {
      saving.value = false;
    }
  }

  // 删除账户并在成功后刷新列表。
  async function deleteAccount(id) {
    saving.value = true;
    try {
      await apiDeleteAccount(id);
      delete detailMap[id];
      await fetchAccounts({ force: true });
    } finally {
      saving.value = false;
    }
  }

  // 获取指定账户详情，并支持优先读取本地缓存。
  async function fetchAccountDetail(id, { useCache = true } = {}) {
    if (useCache && detailMap[id]) return detailMap[id];

    const res = await getAccountDetail(id);
    const detail = res.data;
    if (detail) detailMap[id] = detail;
    return detail;
  }

  // 重置账户 store 的全部状态并停止自动刷新。
  function reset() {
    stopAccountsAutoRefresh();

    accounts.value = [];
    loading.value = false;
    saving.value = false;
    error.value = null;

    fetched.value = false;

    fetchPromise.value = null;

    Object.keys(detailMap).forEach((k) => delete detailMap[k]);
  }

  return {
    accounts,
    loading,
    saving,
    error,
    detailMap,

    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    fetchAccountDetail,
    startAccountsAutoRefresh,
    stopAccountsAutoRefresh,

    reset,
  };
});

