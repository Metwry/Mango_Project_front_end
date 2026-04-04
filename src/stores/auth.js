import { defineStore } from "pinia";
import { computed, ref } from "vue";
import axios from "axios";
import { AUTH_ENDPOINTS } from "@/config/Config";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user";

// 根据本地或会话存储的登录信息选择当前应使用的存储介质。
const getInitialStorage = () => {
  const hasLocalAuth =
    !!localStorage.getItem(ACCESS_TOKEN_KEY) ||
    !!localStorage.getItem(REFRESH_TOKEN_KEY);
  const hasSessionAuth =
    !!sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
    !!sessionStorage.getItem(REFRESH_TOKEN_KEY);

  if (hasLocalAuth) return localStorage;
  if (hasSessionAuth) return sessionStorage;
  return localStorage;
};

// 解析本地存储中的用户信息 JSON。
const parseUser = (raw) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// 清空指定存储中的鉴权相关数据。
const clearStorage = (storage) => {
  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
  storage.removeItem(USER_KEY);
};

// 按需动态加载应用内依赖登录状态的各个 store。
const loadAppStores = async () => {
  const [accountsMod, transactionsMod, investmentMod, marketMod, aiMod] = await Promise.all([
    import("@/stores/accounts"),
    import("@/stores/transaction"),
    import("@/stores/investment"),
    import("@/stores/market"),
    import("@/stores/ai"),
  ]);

  return {
    accountsStore: accountsMod.useAccountsStore(),
    transactionsStore: transactionsMod.useTransactionsStore(),
    investmentStore: investmentMod.useInvestmentStore(),
    marketStore: marketMod.useMarketStore(),
    aiStore: aiMod.useAiStore(),
  };
};

// 管理用户登录态、令牌持久化以及应用级初始化逻辑。
export const useAuthStore = defineStore("auth", () => {
  const activeStorage = ref(getInitialStorage());

  const accessToken = ref(activeStorage.value.getItem(ACCESS_TOKEN_KEY) ?? "");
  const refreshToken = ref(activeStorage.value.getItem(REFRESH_TOKEN_KEY) ?? "");
  const user = ref(parseUser(activeStorage.value.getItem(USER_KEY)));

  // 计算当前用户是否已登录。
  const isLoggedIn = computed(() => !!accessToken.value);
  // 计算当前登录态是否使用本地持久化存储。
  const rememberLogin = computed(() => activeStorage.value === localStorage);

  // 重置所有依赖登录态的业务 store。
  async function resetAppStores() {
    const { accountsStore, transactionsStore, investmentStore, marketStore, aiStore } = await loadAppStores();

    accountsStore.reset();
    transactionsStore.reset();
    investmentStore.reset();
    marketStore.reset();
    aiStore.reset();

    return { accountsStore, transactionsStore, investmentStore, marketStore, aiStore };
  }

  // 登录成功后初始化各个业务 store 的基础数据。
  async function initializeAppStores() {
    const { accountsStore, transactionsStore, investmentStore, marketStore, aiStore } = await loadAppStores();
    await Promise.allSettled([
      accountsStore.fetchAccounts(),
      transactionsStore.fetchList(),
      investmentStore.fetchPositions({ silent: true }),
      marketStore.fetchMarkets({ silent: true }),
      aiStore.fetchSessions(),
    ]);
  }

  // 将当前登录态持久化到指定存储介质中。
  const persistAuthState = ({ remember }) => {
    const targetStorage = remember ? localStorage : sessionStorage;
    const shadowStorage = remember ? sessionStorage : localStorage;

    clearStorage(shadowStorage);

    if (accessToken.value) {
      targetStorage.setItem(ACCESS_TOKEN_KEY, accessToken.value);
    } else {
      targetStorage.removeItem(ACCESS_TOKEN_KEY);
    }

    if (refreshToken.value) {
      targetStorage.setItem(REFRESH_TOKEN_KEY, refreshToken.value);
    } else {
      targetStorage.removeItem(REFRESH_TOKEN_KEY);
    }

    targetStorage.setItem(USER_KEY, JSON.stringify(user.value));
    activeStorage.value = targetStorage;
  };

  // 通过用户名和密码执行登录，并初始化应用状态。
  async function login(username, password, options = {}) {
    const remember = options?.remember ?? true;
    const res = await axios.post(AUTH_ENDPOINTS.loginUrl, { username, password });

    const { access, refresh, user: u } = res.data;

    accessToken.value = access ?? "";
    refreshToken.value = refresh ?? "";
    user.value = u ?? null;

    persistAuthState({ remember });

    await resetAppStores();
    await initializeAppStores();
  }

  // 执行登出并清理本地登录态与业务数据。
  async function logout() {
    accessToken.value = "";
    refreshToken.value = "";
    user.value = null;

    clearStorage(localStorage);
    clearStorage(sessionStorage);
    activeStorage.value = localStorage;

    await resetAppStores();
  }

  // 更新访问令牌并同步持久化。
  function setAccessToken(token) {
    accessToken.value = token ?? "";
    persistAuthState({ remember: rememberLogin.value });
  }

  // 更新刷新令牌并同步持久化。
  function setRefreshToken(token) {
    refreshToken.value = token ?? "";
    persistAuthState({ remember: rememberLogin.value });
  }

  // 更新当前用户信息并同步持久化。
  function setUser(nextUser) {
    user.value = nextUser ?? null;
    persistAuthState({ remember: rememberLogin.value });
  }

  return {
    accessToken,
    refreshToken,
    user,
    isLoggedIn,
    rememberLogin,
    login,
    logout,
    setAccessToken,
    setRefreshToken,
    setUser,
  };
});

