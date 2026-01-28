import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import LoginView from "../pages/Login.vue";
import Home from "../pages/Home.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 1. 登录页 (独立，不带侧边栏)
    {
      path: "/login",
      name: "login",
      component: LoginView,
    },

    // 2. 主应用区域 (包含侧边栏)
    {
      path: "/",
      component: Home,
      redirect: "/dashboard", // 登录后默认跳到仪表盘
      meta: { requireAuth: true }, // 整个区域都需要登录

      // 这里的 children 会渲染到 Home.vue 里的 <RouterView /> 位置
      children: [
        {
          path: "dashboard",
          name: "Dashboard",
          component: () => import("../pages/Dashboard.vue"),
          meta: { title: "仪表盘", icon: "dashboard" },
        },
        {
          path: "bookkeeping",
          name: "Bookkeeping",
          component: () => import("../pages/Bookkeeping.vue"),
          meta: { title: "记账", icon: "bookkeeping" },
        },
        {
          path: "holdings",
          name: "Holdings",
          component: () => import("../pages/Holdings.vue"),
          meta: { title: "持仓", icon: "holdings" },
        },
        {
          path: "market",
          name: "Market",
          component: () => import("../pages/Market.vue"),
          meta: { title: "行情", icon: "market" },
        },
      ],
    },
  ],
});

// --- 新增的核心代码：全局前置守卫-- -
router.beforeEach((to, from, next) => {
  // 1. 在路由守卫内部调用 Store (必须在 router 创建之后)
  const authStore = useAuthStore();

  // 2. 检查即将去的页面是否需要认证
  if (to.meta.requireAuth) {
    // 3. 判断是否有 Token
    // 注意：这里同时检查 Store 和 localStorage 是为了防止页面刷新导致 Store 瞬间被清空
    // 如果你的 authStore 已经做了持久化插件(persist)，只判断 authStore.accessToken 也可以
    const hasToken =
      authStore.accessToken || localStorage.getItem("access_token");
    const hasRefresh =
      authStore.refreshToken || localStorage.getItem("refresh_token");
    if (hasToken || hasRefresh) {
      // 有 Token，放行
      next();
    } else {
      // 没 Token，强制跳转到登录页
      // query: { redirect: ... } 是为了让你登录后能自动跳回刚才想去的页面
      next({
        path: "/login",
        query: { redirect: to.fullPath },
      });
    }
  } else {
    // 4. 不需要认证的页面（比如 /login），直接放行
    next();
  }
});

export default router;
