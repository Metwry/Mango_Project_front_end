import { defineStore } from "pinia";
import { computed, ref } from "vue";
import axios from "axios";
import { AUTH_ENDPOINTS } from "@/config/Config";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user";

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

const parseUser = (raw) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const clearStorage = (storage) => {
  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
  storage.removeItem(USER_KEY);
};

const loadAppStores = async () => {
  const [accountsMod, transactionsMod, investmentMod, marketMod] = await Promise.all([
    import("@/stores/accounts"),
    import("@/stores/transaction"),
    import("@/stores/investment"),
    import("@/stores/market"),
  ]);

  return {
    accountsStore: accountsMod.useAccountsStore(),
    transactionsStore: transactionsMod.useTransactionsStore(),
    investmentStore: investmentMod.useInvestmentStore(),
    marketStore: marketMod.useMarketStore(),
  };
};

export const useAuthStore = defineStore("auth", () => {
  const activeStorage = ref(getInitialStorage());

  const accessToken = ref(activeStorage.value.getItem(ACCESS_TOKEN_KEY) ?? "");
  const refreshToken = ref(activeStorage.value.getItem(REFRESH_TOKEN_KEY) ?? "");
  const user = ref(parseUser(activeStorage.value.getItem(USER_KEY)));

  const isLoggedIn = computed(() => !!accessToken.value);
  const rememberLogin = computed(() => activeStorage.value === localStorage);

  async function resetAppStores() {
    const { accountsStore, transactionsStore, investmentStore, marketStore } = await loadAppStores();

    accountsStore.reset();
    transactionsStore.reset();
    investmentStore.reset();
    marketStore.reset();

    return { accountsStore, transactionsStore, investmentStore, marketStore };
  }

  async function initializeAppStores() {
    const { accountsStore, transactionsStore, investmentStore, marketStore } = await loadAppStores();
    await Promise.allSettled([
      accountsStore.fetchAccounts(),
      transactionsStore.fetchList(),
      investmentStore.fetchPositions({ silent: true }),
      marketStore.fetchMarkets({ silent: true }),
    ]);
  }

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

  async function logout() {
    accessToken.value = "";
    refreshToken.value = "";
    user.value = null;

    clearStorage(localStorage);
    clearStorage(sessionStorage);
    activeStorage.value = localStorage;

    await resetAppStores();
  }

  function setAccessToken(token) {
    accessToken.value = token ?? "";
    persistAuthState({ remember: rememberLogin.value });
  }

  function setRefreshToken(token) {
    refreshToken.value = token ?? "";
    persistAuthState({ remember: rememberLogin.value });
  }

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

