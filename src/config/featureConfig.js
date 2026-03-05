export const STORE_REFRESH_CONFIG = Object.freeze({
  accounts: Object.freeze({
    intervalMinutes: 10,
    second: 5,
  }),
  investmentQuotes: Object.freeze({
    intervalMinutes: 10,
    second: 30,
  }),
  market: Object.freeze({
    intervalMinutes: 10,
    second: 30,
    selectedMarketStorageKey: "market_selected_market",
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
  staleMs: 10 * 60 * 1000,
  usdRatesEndpoint: String(
    import.meta.env.VITE_USD_RATES_ENDPOINT ?? "/user/markets/fx-rates/",
  ),
});

export const DASHBOARD_WORTH_CONFIG = Object.freeze({
  monthlyChangeDefault: 3.2,
  displayCurrency: "CNY",
  displayLocale: "zh-CN",
});

export const FUND_PROPORTION_CONFIG = Object.freeze({
  maxDisplayedAccounts: 5,
  othersName: "其他",
  othersColor: "#94A3B8",
});

export const DASHBOARD_TREND_CONFIG = Object.freeze({
  rangeOptions: Object.freeze([
    Object.freeze({ key: "today", label: "今天", level: "M15", days: 0 }),
    Object.freeze({ key: "7d", label: "近7天", level: "H4", days: 7 }),
    Object.freeze({ key: "30d", label: "近30天", level: "D1", days: 30 }),
    Object.freeze({ key: "1y", label: "近1年", level: "MON1", days: 365 }),
    Object.freeze({ key: "all", label: "至今为止", level: "MON1", days: 3650 }),
  ]),
  allAccountsThemeColor: "#6366F1",
  maxRenderPoints: 24,
  lineWidth: Object.freeze({
    allAccounts: 3.4,
    account: 3,
  }),
  snapshotLimit: 10000,
  todayAutoRefresh: Object.freeze({
    intervalMinutes: 15,
    second: 20,
  }),
});

export const POSITION_TREND_CONFIG = Object.freeze({
  level: "M15",
  lookbackHours: 24,
  snapshotLimit: 10000,
  maxRenderPoints: 24,
  autoRefresh: Object.freeze({
    intervalMinutes: 15,
    second: 20,
  }),
  headerLabel: "今日走势(15m更新)",
});

export const SEARCH_CONFIG = Object.freeze({
  marketPage: Object.freeze({
    debounceMs: 250,
    cacheLimit: 50,
  }),
  addPosition: Object.freeze({
    debounceMs: 250,
    dropdownHideDelayMs: 120,
  }),
});
