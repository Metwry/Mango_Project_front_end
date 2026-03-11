import { computed, ref } from "vue";
import { DASHBOARD_WORTH_CONFIG } from "@/config/Config";

const DISPLAY_CURRENCY_OPTIONS = DASHBOARD_WORTH_CONFIG.displayCurrencyOptions;
const DISPLAY_CURRENCY_VALUES = new Set(
  DISPLAY_CURRENCY_OPTIONS.map((item) => String(item.value || "").toUpperCase()),
);
const DISPLAY_CURRENCY_STORAGE_KEY = DASHBOARD_WORTH_CONFIG.displayCurrencyStorageKey;

function normalizeDisplayCurrency(value) {
  const code = String(value ?? "").trim().toUpperCase();
  if (DISPLAY_CURRENCY_VALUES.has(code)) return code;
  return DASHBOARD_WORTH_CONFIG.displayCurrency;
}

function readPersistedDisplayCurrency() {
  if (typeof window === "undefined") {
    return normalizeDisplayCurrency(DASHBOARD_WORTH_CONFIG.displayCurrency);
  }

  try {
    return normalizeDisplayCurrency(
      window.localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY),
    );
  } catch {
    return normalizeDisplayCurrency(DASHBOARD_WORTH_CONFIG.displayCurrency);
  }
}

const sharedDisplayCurrency = ref(readPersistedDisplayCurrency());

function persistDisplayCurrency(currency) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, currency);
  } catch {
    // Ignore localStorage failures and keep in-memory state usable.
  }
}

function setDisplayCurrency(value) {
  const next = normalizeDisplayCurrency(value);
  sharedDisplayCurrency.value = next;
  persistDisplayCurrency(next);
}

function cycleDisplayCurrency() {
  const index = DISPLAY_CURRENCY_OPTIONS.findIndex(
    (item) => item.value === sharedDisplayCurrency.value,
  );
  const nextIndex = index >= 0
    ? (index + 1) % DISPLAY_CURRENCY_OPTIONS.length
    : 0;
  const next = DISPLAY_CURRENCY_OPTIONS[nextIndex]?.value ?? DASHBOARD_WORTH_CONFIG.displayCurrency;
  setDisplayCurrency(next);
  return next;
}

export function useDashboardDisplayCurrency() {
  const displayCurrency = sharedDisplayCurrency;
  const displayCurrencyMeta = computed(() => {
    return DISPLAY_CURRENCY_OPTIONS.find((item) => item.value === displayCurrency.value)
      ?? DISPLAY_CURRENCY_OPTIONS[0];
  });
  const nextDisplayCurrencyMeta = computed(() => {
    const index = DISPLAY_CURRENCY_OPTIONS.findIndex(
      (item) => item.value === displayCurrency.value,
    );
    const nextIndex = index >= 0
      ? (index + 1) % DISPLAY_CURRENCY_OPTIONS.length
      : 0;
    return DISPLAY_CURRENCY_OPTIONS[nextIndex] ?? DISPLAY_CURRENCY_OPTIONS[0];
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
