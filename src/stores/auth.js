import { defineStore } from "pinia";
import axios from "axios";
import { useAccountsStore } from "@/stores/accounts";

export const useAuthStore = defineStore("auth", {
  // 定义数据
  state: function () {
    // 第一步：先处理 accessToken
    // 1. 尝试从硬盘（localStorage）里拿 token
    let localAccess = localStorage.getItem("access_token");
    // 2. 如果硬盘里没有（结果是 null），就给它一个空字符串，防止报错
    if (localAccess === null) {
      localAccess = "";
    }
    // 第二步：处理 refreshToken
    let localRefresh = localStorage.getItem("refresh_token");
    if (localRefresh === null) {
      localRefresh = "";
    }
    // 第三步：处理 user
    // 1. 先把字符串拿出来（因为存进去的时候是 JSON 字符串）
    let userString = localStorage.getItem("user");
    let finalUser = null; // 默认是没登录
    // 2. 如果字符串存在（不是 null），说明以前登录过
    if (userString !== null) {
      // 3. 把 "字符串" 还原成 "对象" (JSON.parse)
      finalUser = JSON.parse(userString);
    }
    // 第四步：把准备好的变量，统一返回给 Pinia
    return {
      accessToken: localAccess,
      refreshToken: localRefresh,
      user: finalUser,
    };
  },
  // 定义计算属性
  getters: {
    // 这里的 state 就是上面那个 state 对象
    isLoggedIn: function (state) {
      // 1. 看看 accessToken 里有没有东西
      if (state.accessToken !== "" && state.accessToken !== null) {
        // 如果不为空，说明“已登录”
        return true;
      } else {
        // 如果是空的，说明“未登录”
        return false;
      }
    },
  },
  // 定义方法
  actions: {
    async login(username, password) {
      // 登录用“普通 axios”就行（不走 api 实例，避免带旧 token）
      const res = await axios.post("/api/login/", { username, password });

      const { access, refresh, user } = res.data;

      // 保存 token 和用户信息
      this.accessToken = access;
      this.refreshToken = refresh;
      this.user = user;

      // 登录成功后把 token 存 localStorage
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      localStorage.setItem("user", JSON.stringify(user));
    },

    logout() {
      const accountsStore = useAccountsStore();
      this.accessToken = "";
      this.refreshToken = "";
      this.user = null;

      accountsStore.$reset();
    },
    setAccessToken(token) {
      this.accessToken = token;
      localStorage.setItem("access_token", token);
    },
    setRefreshToken(token) {
      this.refreshToken = token;
      localStorage.setItem("refresh_token", token);
    },
  },
});
