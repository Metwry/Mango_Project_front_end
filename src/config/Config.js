function readTextEnv(name, fallback) {
  const text = String(import.meta.env[name] ?? "").trim();
  return text || fallback;
}

function readIntEnv(
  name,
  fallback,
  { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {},
) {
  const raw = Number(import.meta.env[name]);
  if (!Number.isFinite(raw)) return fallback;
  const n = Math.trunc(raw);
  if (n < min || n > max) return fallback;
  return n;
}

function joinBasePath(base, path) {
  const baseText = String(base ?? "")
    .trim()
    .replace(/\/+$/, "");
  const pathText = String(path ?? "").trim();
  if (!baseText) return pathText;
  if (!pathText) return baseText;
  return `${baseText}${pathText.startsWith("/") ? pathText : `/${pathText}`}`;
}

const DEFAULT_APP_VERSION = "1.0.0";
const DEFAULT_API_BASE_URL = "/api";
const DEFAULT_API_TIMEOUT_MS = 10000;
const DEFAULT_ERROR_TOAST_MIN_INTERVAL_MS = 1800;
const DEFAULT_ERROR_TOAST_DUPLICATE_SUPPRESS_MS = 12000;

export const APP_VERSION = readTextEnv("VITE_APP_VERSION", DEFAULT_APP_VERSION);
export const APP_VERSION_LABEL = `V ${APP_VERSION}`;

export const API_BASE_URL = readTextEnv(
  "VITE_API_BASE_URL",
  DEFAULT_API_BASE_URL,
);
export const API_TIMEOUT_MS = readIntEnv(
  "VITE_API_TIMEOUT_MS",
  DEFAULT_API_TIMEOUT_MS,
  {
    min: 1000,
    max: 120000,
  },
);
export const API_ERROR_TOAST_MIN_INTERVAL_MS = readIntEnv(
  "VITE_ERROR_TOAST_MIN_INTERVAL_MS",
  DEFAULT_ERROR_TOAST_MIN_INTERVAL_MS,
  { min: 0, max: 60000 },
);
export const API_ERROR_TOAST_DUPLICATE_SUPPRESS_MS = readIntEnv(
  "VITE_ERROR_TOAST_DUPLICATE_SUPPRESS_MS",
  DEFAULT_ERROR_TOAST_DUPLICATE_SUPPRESS_MS,
  { min: 0, max: 120000 },
);

const DEFAULT_AUTH_EMAIL_CODE_ENDPOINT = "/register/email/code/";
const DEFAULT_AUTH_EMAIL_REGISTER_ENDPOINT = "/register/email/";
const DEFAULT_AUTH_PASSWORD_RESET_CODE_ENDPOINT = "/password/reset/code/";
const DEFAULT_AUTH_PASSWORD_RESET_ENDPOINT = "/password/reset/";

export const AUTH_ENDPOINTS = Object.freeze({
  loginUrl: readTextEnv(
    "VITE_AUTH_LOGIN_URL",
    joinBasePath(API_BASE_URL, "/login/"),
  ),
  tokenRefreshUrl: readTextEnv(
    "VITE_AUTH_TOKEN_REFRESH_URL",
    joinBasePath(API_BASE_URL, "/token/refresh/"),
  ),
  emailCode: readTextEnv(
    "VITE_AUTH_EMAIL_CODE_ENDPOINT",
    DEFAULT_AUTH_EMAIL_CODE_ENDPOINT,
  ),
  emailRegister: readTextEnv(
    "VITE_AUTH_EMAIL_REGISTER_ENDPOINT",
    DEFAULT_AUTH_EMAIL_REGISTER_ENDPOINT,
  ),
  passwordResetCode: readTextEnv(
    "VITE_AUTH_PASSWORD_RESET_CODE_ENDPOINT",
    DEFAULT_AUTH_PASSWORD_RESET_CODE_ENDPOINT,
  ),
  passwordReset: readTextEnv(
    "VITE_AUTH_PASSWORD_RESET_ENDPOINT",
    DEFAULT_AUTH_PASSWORD_RESET_ENDPOINT,
  ),
});

const DEFAULT_INVESTMENT_BUY_ENDPOINT = "/investment/buy/";
const DEFAULT_INVESTMENT_SELL_ENDPOINT = "/investment/sell/";

export const INVESTMENT_ENDPOINTS = Object.freeze({
  buy: readTextEnv(
    "VITE_INVESTMENT_BUY_ENDPOINT",
    DEFAULT_INVESTMENT_BUY_ENDPOINT,
  ),
  sell: readTextEnv(
    "VITE_INVESTMENT_SELL_ENDPOINT",
    DEFAULT_INVESTMENT_SELL_ENDPOINT,
  ),
});

export const AUTO_REFRESH_ENABLED =
  readTextEnv("VITE_REFRESH_MODE", "auto").toLowerCase() !== "manual";

export const STORE_REFRESH_CONFIG = Object.freeze({
  accounts: Object.freeze({
    intervalMinutes: readIntEnv("VITE_REFRESH_ACCOUNTS_INTERVAL_MINUTES", 10, {
      min: 1,
      max: 60,
    }),
    second: readIntEnv("VITE_REFRESH_ACCOUNTS_SECOND", 5, { min: 0, max: 59 }),
  }),
  investmentQuotes: Object.freeze({
    intervalMinutes: readIntEnv(
      "VITE_REFRESH_INVESTMENT_INTERVAL_MINUTES",
      10,
      { min: 1, max: 60 },
    ),
    second: readIntEnv("VITE_REFRESH_INVESTMENT_SECOND", 30, {
      min: 0,
      max: 59,
    }),
  }),
  market: Object.freeze({
    intervalMinutes: readIntEnv("VITE_REFRESH_MARKET_INTERVAL_MINUTES", 10, {
      min: 1,
      max: 60,
    }),
    second: readIntEnv("VITE_REFRESH_MARKET_SECOND", 30, { min: 0, max: 59 }),
    selectedMarketStorageKey: readTextEnv(
      "VITE_MARKET_SELECTED_STORAGE_KEY",
      "market_selected_market",
    ),
  }),
});

export const FX_RATES_CONFIG = Object.freeze({
  defaultUsdPerCurrencyRates: Object.freeze({
    USD: 1,
    CNY: 0.14,
    EUR: 1.08,
    JPY: 0.0067,
    GBP: 1.27,
    HKD: 0.128,
  }),
  staleMs: readIntEnv("VITE_FX_RATES_STALE_MS", 10 * 60 * 1000, {
    min: 1000,
    max: 24 * 60 * 60 * 1000,
  }),
  usdRatesEndpoint: readTextEnv(
    "VITE_USD_RATES_ENDPOINT",
    "/user/markets/fx-rates/",
  ),
});

export const DASHBOARD_WORTH_CONFIG = Object.freeze({
  displayCurrency: readTextEnv(
    "VITE_DASHBOARD_DISPLAY_CURRENCY",
    "CNY",
  ).toUpperCase(),
  displayLocale: readTextEnv("VITE_DASHBOARD_DISPLAY_LOCALE", "zh-CN"),
  displayCurrencyStorageKey: readTextEnv(
    "VITE_DASHBOARD_DISPLAY_CURRENCY_STORAGE_KEY",
    "dashboard_display_currency",
  ),
  displayCurrencyOptions: Object.freeze([
    Object.freeze({ value: "CNY", label: "人民币" }),
    Object.freeze({ value: "USD", label: "美元" }),
    Object.freeze({ value: "HKD", label: "港币" }),
    Object.freeze({ value: "EUR", label: "欧元" }),
    Object.freeze({ value: "JPY", label: "日元" }),
  ]),
});

export const FUND_PROPORTION_CONFIG = Object.freeze({
  maxDisplayedAccounts: 5,
  othersName: "其他",
  othersColor: "#94A3B8",
});

export const DASHBOARD_TREND_CONFIG = Object.freeze({
  maxRenderPoints: readIntEnv("VITE_DASHBOARD_TREND_MAX_RENDER_POINTS", 24, {
    min: 2,
    max: 5000,
  }),
  rangeOptions: Object.freeze([
    Object.freeze({
      key: "today",
      label: "过去24小时",
      level: "M15",
      days: 0,
      maxRenderPoints: readIntEnv(
        "VITE_DASHBOARD_TREND_TODAY_MAX_RENDER_POINTS",
        96,
        { min: 2, max: 5000 },
      ),
    }),
    Object.freeze({
      key: "7d",
      label: "近7天",
      level: "H4",
      days: 7,
      maxRenderPoints: readIntEnv(
        "VITE_DASHBOARD_TREND_7D_MAX_RENDER_POINTS",
        96,
        { min: 2, max: 5000 },
      ),
    }),
    Object.freeze({
      key: "30d",
      label: "近30天",
      level: "D1",
      days: 60,
      maxRenderPoints: readIntEnv(
        "VITE_DASHBOARD_TREND_30D_MAX_RENDER_POINTS",
        24,
        { min: 2, max: 5000 },
      ),
    }),
    Object.freeze({
      key: "1y",
      label: "近1年",
      level: "MON1",
      days: 365,
      maxRenderPoints: readIntEnv(
        "VITE_DASHBOARD_TREND_1Y_MAX_RENDER_POINTS",
        24,
        { min: 2, max: 5000 },
      ),
    }),
    Object.freeze({
      key: "all",
      label: "至今为止",
      level: "MON1",
      days: 3650,
      maxRenderPoints: readIntEnv(
        "VITE_DASHBOARD_TREND_ALL_MAX_RENDER_POINTS",
        24,
        { min: 2, max: 5000 },
      ),
    }),
  ]),
  allAccountsThemeColor: "#94A3B8",
  lineWidth: Object.freeze({
    allAccounts: 3.4,
    account: 3,
  }),
  snapshotLimit: 10000,
  todayAutoRefresh: Object.freeze({
    intervalMinutes: readIntEnv(
      "VITE_REFRESH_DASHBOARD_TREND_INTERVAL_MINUTES",
      15,
      { min: 1, max: 240 },
    ),
    second: readIntEnv("VITE_REFRESH_DASHBOARD_TREND_SECOND", 20, {
      min: 0,
      max: 59,
    }),
  }),
});

export const POSITION_TREND_CONFIG = Object.freeze({
  level: "M15",
  lookbackHours: 24,
  snapshotLimit: 10000,
  maxRenderPoints: readIntEnv("VITE_POSITION_TREND_MAX_RENDER_POINTS", 96, {
    min: 2,
    max: 5000,
  }),
  autoRefresh: Object.freeze({
    intervalMinutes: readIntEnv(
      "VITE_REFRESH_POSITION_TREND_INTERVAL_MINUTES",
      15,
      { min: 1, max: 240 },
    ),
    second: readIntEnv("VITE_REFRESH_POSITION_TREND_SECOND", 20, {
      min: 0,
      max: 59,
    }),
  }),
  headerLabel: "今日走势(15m更新)",
});

export const SEARCH_CONFIG = Object.freeze({
  marketPage: Object.freeze({
    debounceMs: readIntEnv("VITE_SEARCH_MARKET_DEBOUNCE_MS", 250, {
      min: 50,
      max: 5000,
    }),
    cacheLimit: readIntEnv("VITE_SEARCH_MARKET_CACHE_LIMIT", 50, {
      min: 10,
      max: 500,
    }),
  }),
  addPosition: Object.freeze({
    debounceMs: readIntEnv("VITE_SEARCH_ADD_POSITION_DEBOUNCE_MS", 250, {
      min: 50,
      max: 5000,
    }),
    dropdownHideDelayMs: readIntEnv(
      "VITE_SEARCH_ADD_POSITION_HIDE_DELAY_MS",
      120,
      { min: 0, max: 1000 },
    ),
  }),
});
