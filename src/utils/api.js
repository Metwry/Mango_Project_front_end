import axios from "axios";
import { useAuthStore } from "@/stores/auth";
import { ElMessage } from "element-plus";
import router from "@/router";

const api = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

const AUTH_FREE_PATHS = ["/login/", "/token/refresh/"];

function isAuthFreeRequest(url = "") {
  return AUTH_FREE_PATHS.some((path) => String(url).includes(path));
}

function extractBackendErrorMessage(payload) {
  const raw = payload?.massage ?? payload?.message;
  if (typeof raw === "string") {
    const text = raw.trim();
    return text || "";
  }

  if (Array.isArray(raw)) {
    const firstText = raw.find((item) => typeof item === "string" && item.trim());
    return firstText ? firstText.trim() : "";
  }

  return "";
}

api.interceptors.request.use(
  (config) => {
    const auth = useAuthStore();

    config.headers = config.headers || {};
    if (isAuthFreeRequest(config.url)) {
      if (config.headers.Authorization) delete config.headers.Authorization;
      return config;
    }

    if (auth.accessToken) {
      config.headers.Authorization = `Bearer ${auth.accessToken}`;
    } else if (config.headers.Authorization) {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

let isRefreshing = false;
let requestsQueue = [];

const processQueue = (error, token = null) => {
  requestsQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  requestsQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const auth = useAuthStore();
    const originalRequest = error.config || {};

    if (!error.response) {
      ElMessage.error("网络连接失败，请检查网络");
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    if (status === 401 && !originalRequest._retry) {
      if (isAuthFreeRequest(originalRequest.url)) {
        await auth.logout();
        router.replace("/login");
        ElMessage.error("认证失败，请重新登录");
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          requestsQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data: resData } = await axios.post("/api/token/refresh/", {
          refresh: auth.refreshToken,
        });

        if (resData.access) {
          const newToken = resData.access;
          auth.setAccessToken(newToken);

          api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          processQueue(null, newToken);

          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        await auth.logout();
        router.replace("/login");
        ElMessage.error("登录已过期，请重新登录");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const message = extractBackendErrorMessage(data) || "请求失败";
    if (status !== 401) {
      ElMessage.error(message);
    }

    return Promise.reject(error);
  },
);

export default api;
