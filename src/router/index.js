import { createRouter, createWebHistory } from "vue-router";
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

export default router;
