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

// 判断当前请求是否属于无需鉴权的接口。
function isAuthFreeRequest(url = "") {
  return AUTH_FREE_PATHS.some((path) => String(url).includes(path));
}

// 判断当前页面是否处于后台隐藏状态。
function isPageHidden() {
  return typeof document !== "undefined" && document.hidden;
}

// 根据时间间隔和去重规则判断是否应抑制错误提示。
function shouldSuppressErrorToast(key = "", now = Date.now()) {
  if (isPageHidden()) return true;

  const elapsed = now - lastErrorToastAt;
  if (elapsed < API_ERROR_TOAST_MIN_INTERVAL_MS) return true;

  const sameKey = key && key === lastErrorToastKey;
  if (sameKey && elapsed < API_ERROR_TOAST_DUPLICATE_SUPPRESS_MS) return true;

  return false;
}

// 统一弹出错误提示，并按节流规则避免频繁打扰用户。
function notifyError(message, { key = String(message ?? "") } = {}) {
  const text = String(message ?? "").trim();
  if (!text) return;

  const now = Date.now();
  if (shouldSuppressErrorToast(String(key ?? ""), now)) return;

  lastErrorToastAt = now;
  lastErrorToastKey = String(key ?? "");
  ElMessage.error(text);
}

// 从后端响应体中提取可直接展示的错误信息。
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

let refreshPromise = null;

// 刷新访问令牌，并在并发 401 场景下复用同一个刷新请求。
function refreshAccessToken(auth) {
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios
    .post(AUTH_ENDPOINTS.tokenRefreshUrl, {
      refresh: auth.refreshToken,
    })
    .then(({ data }) => {
      const newToken = String(data?.access ?? "").trim();
      if (!newToken) {
        throw new Error("Token refresh response missing access token");
      }

      auth.setAccessToken(newToken);
      return newToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

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

      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken(auth);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        await auth.logout();
        router.replace("/login");
        if (!suppressErrorToast) {
          notifyError("登录已过期，请重新登录", { key: "401_refresh_failed" });
        }
        return Promise.reject(refreshError);
      }
    }

    const message = extractBackendErrorMessage(data) || "请求失败";
    if (status !== 401 && !suppressErrorToast) {
      notifyError(message, { key: `${status}:${message}` });
    }

    return Promise.reject(error);
  },
);

export default api;

