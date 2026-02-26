import { defineStore } from "pinia";
import { computed, ref } from "vue";
import axios from "axios";

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

export const useAuthStore = defineStore("auth", () => {
  const activeStorage = ref(getInitialStorage());

  const accessToken = ref(activeStorage.value.getItem(ACCESS_TOKEN_KEY) ?? "");
  const refreshToken = ref(activeStorage.value.getItem(REFRESH_TOKEN_KEY) ?? "");
  const user = ref(parseUser(activeStorage.value.getItem(USER_KEY)));

  const isLoggedIn = computed(() => !!accessToken.value);
  const rememberLogin = computed(() => activeStorage.value === localStorage);

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
    const res = await axios.post("/api/login/", { username, password });

    const { access, refresh, user: u } = res.data;

    accessToken.value = access ?? "";
    refreshToken.value = refresh ?? "";
    user.value = u ?? null;

    persistAuthState({ remember });

    import("@/stores/accounts")
      .then(({ useAccountsStore }) => useAccountsStore().reset())
      .catch(() => {});
    import("@/stores/transaction")
      .then(({ useTransactionsStore }) => useTransactionsStore().reset())
      .catch(() => {});
  }

  function logout() {
    accessToken.value = "";
    refreshToken.value = "";
    user.value = null;

    clearStorage(localStorage);
    clearStorage(sessionStorage);
    activeStorage.value = localStorage;

    import("@/stores/accounts")
      .then(({ useAccountsStore }) => useAccountsStore().reset())
      .catch(() => {});
    import("@/stores/transaction")
      .then(({ useTransactionsStore }) => useTransactionsStore().reset())
      .catch(() => {});
  }

  function setAccessToken(token) {
    accessToken.value = token ?? "";
    persistAuthState({ remember: rememberLogin.value });
  }

  function setRefreshToken(token) {
    refreshToken.value = token ?? "";
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
  };
});
