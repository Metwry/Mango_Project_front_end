import { computed, ref } from "vue";
import { DASHBOARD_WORTH_CONFIG } from "@/config/Config";

const DISPLAY_CURRENCY_OPTIONS = DASHBOARD_WORTH_CONFIG.displayCurrencyOptions;
const DISPLAY_CURRENCY_VALUES = new Set(
  DISPLAY_CURRENCY_OPTIONS.map((item) => String(item.value || "").toUpperCase()),
);
const DISPLAY_CURRENCY_STORAGE_KEY = DASHBOARD_WORTH_CONFIG.displayCurrencyStorageKey;

// 规范化展示币种，确保返回值始终是允许的币种代码。
function normalizeDisplayCurrency(value) {
  const code = String(value ?? "").trim().toUpperCase();
  if (DISPLAY_CURRENCY_VALUES.has(code)) return code;
  return DASHBOARD_WORTH_CONFIG.displayCurrency;
}

// 从本地存储读取展示币种，并在异常时回退到默认值。
function readPersistedDisplayCurrency() {
  let raw = null;
  if (typeof window !== "undefined") {
    try {
      raw = window.localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY);
    } catch {}
  }
  return normalizeDisplayCurrency(raw ?? DASHBOARD_WORTH_CONFIG.displayCurrency);
}

const sharedDisplayCurrency = ref(readPersistedDisplayCurrency());

// 将当前展示币种写入本地存储，方便下次进入页面时恢复。
function persistDisplayCurrency(currency) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, currency);
  } catch {
    // Ignore localStorage failures and keep in-memory state usable.
  }
}

// 更新当前展示币种，并同步持久化到本地存储。
function setDisplayCurrency(value) {
  const next = normalizeDisplayCurrency(value);
  sharedDisplayCurrency.value = next;
  persistDisplayCurrency(next);
}

// 获取当前展示币种在配置列表中的索引。
function getDisplayCurrencyIndex(currency) {
  return DISPLAY_CURRENCY_OPTIONS.findIndex(
    (item) => item.value === normalizeDisplayCurrency(currency),
  );
}

// 返回当前展示币种对应的下一个配置项。
function getNextDisplayCurrencyOption(currency) {
  const index = getDisplayCurrencyIndex(currency);
  const nextIndex = index >= 0
    ? (index + 1) % DISPLAY_CURRENCY_OPTIONS.length
    : 0;
  return DISPLAY_CURRENCY_OPTIONS[nextIndex] ?? DISPLAY_CURRENCY_OPTIONS[0];
}

// 按配置顺序切换到下一个展示币种，并返回切换结果。
function cycleDisplayCurrency() {
  const next = getNextDisplayCurrencyOption(sharedDisplayCurrency.value)?.value
    ?? DASHBOARD_WORTH_CONFIG.displayCurrency;
  setDisplayCurrency(next);
  return next;
}

// 提供仪表盘展示币种的共享状态、元信息和切换方法。
export function useDashboardDisplayCurrency() {
  const displayCurrency = sharedDisplayCurrency;
  // 返回当前展示币种对应的配置项，便于界面直接渲染。
  const displayCurrencyMeta = computed(() => {
    return DISPLAY_CURRENCY_OPTIONS.find((item) => item.value === displayCurrency.value)
      ?? DISPLAY_CURRENCY_OPTIONS[0];
  });
  // 计算下一个可切换的展示币种配置项，用于提示或按钮文案展示。
  const nextDisplayCurrencyMeta = computed(() => {
    return getNextDisplayCurrencyOption(displayCurrency.value);
  });

  return {
    displayCurrency,
    displayCurrencyMeta,
    nextDisplayCurrencyMeta,
    displayCurrencyOptions: DISPLAY_CURRENCY_OPTIONS,
    setDisplayCurrency,
    cycleDisplayCurrency,
  };
}
