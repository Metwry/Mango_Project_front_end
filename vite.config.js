import { fileURLToPath, URL } from "node:url";

import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import tailwindcss from "@tailwindcss/vite";

function toInt(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const v = Math.trunc(n);
  if (v < min || v > max) return fallback;
  return v;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const devHost = String(env.VITE_DEV_HOST ?? "127.0.0.1").trim() || "127.0.0.1";
  const devPort = toInt(env.VITE_DEV_PORT, 3000, { min: 1, max: 65535 });
  const proxyTarget = String(env.VITE_DEV_API_PROXY_TARGET ?? "http://127.0.0.1:8000").trim() || "http://127.0.0.1:8000";

  return {
    plugins: [vue(), vueDevTools(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
      host: devHost,
      port: devPort,
    },
  };
});
