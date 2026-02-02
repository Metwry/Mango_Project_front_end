import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axios from "axios";
import { useAccountsStore } from "@/stores/accounts";

export const useAuthStore = defineStore("auth", () => {
  // ===== state 初始化：从 localStorage 读 =====
  const accessToken = ref(localStorage.getItem("access_token") ?? "");
  const refreshToken = ref(localStorage.getItem("refresh_token") ?? "");

  const userRaw = localStorage.getItem("user");
  const user = ref(userRaw ? JSON.parse(userRaw) : null);

  // ===== getters =====
  const isLoggedIn = computed(() => !!accessToken.value);

  // ===== actions =====
  async function login(username, password) {
    // 登录用普通 axios，避免带旧 token（你原逻辑）
    const res = await axios.post("/api/login/", { username, password });

    const { access, refresh, user: u } = res.data;

    accessToken.value = access ?? "";
    refreshToken.value = refresh ?? "";
    user.value = u ?? null;

    localStorage.setItem("access_token", accessToken.value);
    localStorage.setItem("refresh_token", refreshToken.value);
    localStorage.setItem("user", JSON.stringify(user.value));
  }

  function logout() {
    const accountsStore = useAccountsStore();

    accessToken.value = "";
    refreshToken.value = "";
    user.value = null;

    // 建议：同时清掉本地缓存，避免刷新又“复活”
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    // 你原逻辑：退出时清账户 store
    accountsStore.$reset();
  }

  function setAccessToken(token) {
    accessToken.value = token ?? "";
    localStorage.setItem("access_token", accessToken.value);
  }

  function setRefreshToken(token) {
    refreshToken.value = token ?? "";
    localStorage.setItem("refresh_token", refreshToken.value);
  }

  return {
    // state
    accessToken,
    refreshToken,
    user,

    // getters
    isLoggedIn,

    // actions
    login,
    logout,
    setAccessToken,
    setRefreshToken,
  };
});
