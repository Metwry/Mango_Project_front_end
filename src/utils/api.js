import axios from "axios";
import {
  API_BASE_URL,
  API_ERROR_TOAST_DUPLICATE_SUPPRESS_MS,
  API_ERROR_TOAST_MIN_INTERVAL_MS,
  API_TIMEOUT_MS,
  AUTH_ENDPOINTS,
} from "@/config/Config";
import { useAuthStore } from "@/stores/auth";
import { ElMessage } from "@/utils/element";
import router from "@/router";

const NGROK_SKIP_HEADER = "ngrok-skip-browser-warning";
const NGROK_SKIP_VALUE = "true";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    [NGROK_SKIP_HEADER]: NGROK_SKIP_VALUE,
  },
});

axios.defaults.headers.common[NGROK_SKIP_HEADER] = NGROK_SKIP_VALUE;

const AUTH_FREE_PATHS = ["/login/", "/token/refresh/"];

let lastErrorToastAt = 0;
let lastErrorToastKey = "";

function isAuthFreeRequest(url = "") {
  return AUTH_FREE_PATHS.some((path) => String(url).includes(path));
}

function isPageHidden() {
  return typeof document !== "undefined" && document.hidden;
}

function shouldSuppressErrorToast(key = "", now = Date.now()) {
  if (isPageHidden()) return true;

  const elapsed = now - lastErrorToastAt;
  if (elapsed < API_ERROR_TOAST_MIN_INTERVAL_MS) return true;

  const sameKey = key && key === lastErrorToastKey;
  if (sameKey && elapsed < API_ERROR_TOAST_DUPLICATE_SUPPRESS_MS) return true;

  return false;
}

function notifyError(message, { key = String(message ?? "") } = {}) {
  const text = String(message ?? "").trim();
  if (!text) return;

  const now = Date.now();
  if (shouldSuppressErrorToast(String(key ?? ""), now)) return;

  lastErrorToastAt = now;
  lastErrorToastKey = String(key ?? "");
  ElMessage.error(text);
}

function extractBackendErrorMessage(payload) {
  const raw = payload?.message;
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
    config.headers[NGROK_SKIP_HEADER] = NGROK_SKIP_VALUE;
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
    const suppressErrorToast = Boolean(
      originalRequest?.suppressErrorToast ??
      originalRequest?.meta?.suppressErrorToast,
    );

    if (!error.response) {
      if (!suppressErrorToast) {
        notifyError("网络连接失败，请检查网络", { key: "network_error" });
      }
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    if (status === 401 && !originalRequest._retry) {
      if (isAuthFreeRequest(originalRequest.url)) {
        await auth.logout();
        router.replace("/login");
        if (!suppressErrorToast) {
          notifyError("认证失败，请重新登录", { key: "401_auth_free" });
        }
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
        const { data: resData } = await axios.post(AUTH_ENDPOINTS.tokenRefreshUrl, {
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
        if (!suppressErrorToast) {
          notifyError("登录已过期，请重新登录", { key: "401_refresh_failed" });
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const message = extractBackendErrorMessage(data) || "请求失败";
    if (status !== 401 && !suppressErrorToast) {
      notifyError(message, { key: `${status}:${message}` });
    }

    return Promise.reject(error);
  },
);

export function getPayload(response, fallback = null) {
  return response?.data ?? response ?? fallback;
}

export function getResultsList(response, fallback = []) {
  const payload = getPayload(response, null);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return fallback;
}

export function getPagedList(response) {
  const payload = getPayload(response, null);
  if (payload && Array.isArray(payload.results)) {
    return {
      list: payload.results,
      total: payload.count ?? payload.results.length,
    };
  }
  if (Array.isArray(payload)) {
    return {
      list: payload,
      total: payload.length,
    };
  }
  return { list: [], total: 0 };
}

export default api;

