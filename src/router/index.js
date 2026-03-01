import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import LoginView from "../pages/Login.vue";
import Home from "../pages/Home.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: LoginView,
    },

    {
      path: "/",
      component: Home,
      redirect: "/dashboard",
      meta: { requireAuth: true },

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
          path: "investment",
          name: "Investment",
          component: () => import("../pages/Investment.vue"),
          meta: { title: "投资", icon: "holdings" },
        },
        {
          path: "market",
          name: "Market",
          component: () => import("../pages/Market.vue"),
          meta: { title: "行情", icon: "market" },
        },
        {
          path: "analysis",
          name: "Analysis",
          component: () => import("../pages/Analysis.vue"),
          meta: { title: "数据分析", icon: "market" },
        },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  const requiresAuth = to.matched.some((record) => record.meta.requireAuth);

  if (requiresAuth && !auth.isLoggedIn) {
    return {
      path: "/login",
      replace: true,
    };
  }

  if (to.path === "/login" && auth.isLoggedIn) {
    return {
      path: "/dashboard",
      replace: true,
    };
  }

  return true;
});

export default router;
