import axios from "axios";
import { useAuthStore } from "@/stores/auth";
import { ElMessage } from "element-plus"; // 引入 Element Plus 的消息提示
import router from "@/router"; // 引入路由，用于强制跳转登录页

// 创建 axios 实例
const api = axios.create({
  baseURL: "/api",
  timeout: 10000, // 设置超时时间，防止请求卡死
});

// 1. 请求拦截器 (Request Interceptor)

api.interceptors.request.use(
  (config) => {
    const auth = useAuthStore();

    // 白名单：有些接口不需要 Token (如登录、注册)
    // 注意：刷新 Token 的接口也不能带旧的 Access Token，否则后端可能报错
    const whiteList = ["/api/login/", "/api/token/refresh/"];
    config.headers = config.headers || {};
    if (whiteList.some((url) => config.url && config.url.startsWith(url))) {
      if (config.headers.Authorization) delete config.headers.Authorization;
      return config;
    }

    // 如果有 Access Token，就挂载到请求头上
    if (auth.accessToken) {
      config.headers = config.headers || {};
      // 确保没有被手动覆盖过
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

// 2. 响应拦截器 (Response Interceptor)

let isRefreshing = false; // 标记是否正在刷新 Token
let requestsQueue = []; // 重试队列：存储那些因为 Token 过期而挂起的请求

// 辅助函数：执行队列中的请求
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
  (response) => {
    // 2xx 状态码走这里
    // 你可以直接返回 response，也可以返回 response.data 简化前端代码
    return response;
  },
  async (error) => {
    const auth = useAuthStore();
    const originalRequest = error.config;

    // --- 情况 1: 没有响应 (网络错误/超时) ---
    if (!error.response) {
      ElMessage.error("网络连接失败，请检查网络");
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    // --- 情况 2: 401 Unauthorized (Token 过期或无效) ---
    if (status === 401 && !originalRequest._retry) {
      // 如果是“登录接口”或“刷新Token接口”本身报 401，说明没救了，直接登出
      if (
        originalRequest.url.includes("/api/login/") ||
        originalRequest.url.includes("/api/token/refresh/")
      ) {
        auth.logout();
        router.replace("/login");
        ElMessage.error("认证失败，请重新登录");
        return Promise.reject(error);
      }

      // 如果正在刷新中，将当前请求挂起，放入队列
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          requestsQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            return api(originalRequest); // 重新发请求
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // 开始刷新 Token
      originalRequest._retry = true; // 标记该请求已重试过，防止死循环
      isRefreshing = true;

      try {
        // 1. 发送刷新请求 (注意：这里用原始 axios，避免走拦截器死循环)
        const { data: resData } = await axios.post("/api/token/refresh/", {
          refresh: auth.refreshToken,
        });

        if (resData.access) {
          // 2. 刷新成功：存入 Pinia
          const newToken = resData.access;
          auth.setAccessToken(newToken);

          // 3. 修改当前请求的 Header 并重试
          api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;

          // 4. 处理队列中的请求
          processQueue(null, newToken);

          return api(originalRequest);
        }
      } catch (refreshError) {
        // 5. 刷新失败 (Refresh Token 也过期了)
        processQueue(refreshError, null);
        auth.logout();
        router.replace("/login");
        ElMessage.error("登录已过期，请重新登录");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    let message = "请求失败";

    if (data) {
      // 1. 优先处理 DRF 的全局错误字段 non_field_errors
      // 你的截图对应的就是这种情况
      if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
        message = data.non_field_errors[0];
      }
      // 2. 处理标准错误 detail (如 403 权限不足, 404 未找到)
      else if (data.detail) {
        message = data.detail;
      }
      // 3. 处理具体字段的表单错误 (如 { email: ["格式不正确"] })
      else if (typeof data === "object") {
        const keys = Object.keys(data);
        if (keys.length > 0) {
          const firstKey = keys[0];
          const firstValue = data[firstKey];

          if (Array.isArray(firstValue) && firstValue.length > 0) {
            message = firstValue[0];
          } else {
            message = String(firstValue);
          }
        }
      }
    }

    if (status !== 401) {
      ElMessage.error(message);
    }

    return Promise.reject(error);
  },
);

export default api;
