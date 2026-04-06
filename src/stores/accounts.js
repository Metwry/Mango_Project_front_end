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
import { useAsyncState } from "@/composables/useAsyncState";

const AUTO_REFRESH_INTERVAL_MINUTES = STORE_REFRESH_CONFIG.accounts.intervalMinutes;
const AUTO_REFRESH_SECOND = STORE_REFRESH_CONFIG.accounts.second;

// 管理账户列表、账户详情以及自动刷新逻辑。
export const useAccountsStore = defineStore("accounts", () => {
  const accounts = ref([]);
  const saving = ref(false);
  const detailMap = reactive({});

  const { loading, error, fetched, run, reset: resetAsync } = useAsyncState();

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

  // 拉取账户列表，并支持缓存复用与强制刷新。
  async function fetchAccounts({ force = false } = {}) {
    return run({ force, getCached: () => accounts.value }, async () => {
      const res = await getAccounts();
      accounts.value = res.data;
      return accounts.value;
    });
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
          accounts.value[index] = { ...accounts.value[index], ...data };
        }
        detailMap[id] = { ...(detailMap[id] || {}), ...data };
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
    detailMap[id] = res.data;
    return res.data;
  }

  // 重置账户 store 的全部状态并停止自动刷新。
  function reset() {
    stopAccountsAutoRefresh();
    accounts.value = [];
    saving.value = false;
    resetAsync();
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
