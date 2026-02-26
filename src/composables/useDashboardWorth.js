import { onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useAccountsStore } from "@/stores/accounts";
import { getUsdExchangeRates } from "@/utils/exchangeRates";
import {
  buildAccountsValuation,
  DEFAULT_USD_PER_CURRENCY_RATES,
  normalizeUsdPerCurrencyRates,
} from "@/utils/fxRates";

let sharedUsdPerCurrencyRates = { ...DEFAULT_USD_PER_CURRENCY_RATES };
const sharedValuedAccounts = ref([]);
const sharedTotalWorthCny = ref(0);
const sharedTotalWorthUsd = ref(0);
const sharedWorthReady = ref(false);

export function useDashboardWorth() {
  const accountsStore = useAccountsStore();
  const { accounts, fetched, lastFetchedAt } = storeToRefs(accountsStore);

  const valuedAccounts = sharedValuedAccounts;
  const totalWorthCny = sharedTotalWorthCny;
  const totalWorthUsd = sharedTotalWorthUsd;
  const worthReady = sharedWorthReady;

  let syncToken = 0;
  let delayedRefreshTimer = null;

  const applyValuation = (rates = sharedUsdPerCurrencyRates) => {
    const result = buildAccountsValuation(accounts.value, rates);
    valuedAccounts.value = result.valuedAccounts;
    totalWorthCny.value = result.totalValueCny;
    totalWorthUsd.value = result.totalValueUsd;
    worthReady.value = true;
  };

  const refreshWorth = async () => {
    const token = ++syncToken;
    let nextRates = sharedUsdPerCurrencyRates;

    try {
      const res = await getUsdExchangeRates();
      const payload = res?.data ?? res ?? {};
      nextRates = {
        ...nextRates,
        ...normalizeUsdPerCurrencyRates(payload),
        USD: 1,
      };
    } catch {
      // Keep previous rates when FX API is temporarily unavailable.
    }

    if (token !== syncToken) return;

    sharedUsdPerCurrencyRates = nextRates;
    applyValuation(sharedUsdPerCurrencyRates);
  };

  watch(
    () => lastFetchedAt.value,
    (next, prev) => {
      if (!next || next === prev) return;
      void refreshWorth();
    },
  );

  onMounted(async () => {
    if (!fetched.value) {
      try {
        await accountsStore.fetchAccounts();
      } catch {
        // API layer already handles visible error feedback.
      }
      return;
    }

    // Recompute immediately with cached FX so entry animation has a stable target.
    applyValuation(sharedUsdPerCurrencyRates);

    if (worthReady.value) {
      // Avoid immediate second write on route-enter; refresh rates after entry animation settles.
      delayedRefreshTimer = setTimeout(() => {
        void refreshWorth();
      }, 1000);
      return;
    }

    void refreshWorth();
  });

  onUnmounted(() => {
    if (delayedRefreshTimer) {
      clearTimeout(delayedRefreshTimer);
      delayedRefreshTimer = null;
    }
  });

  return {
    accounts,
    valuedAccounts,
    totalWorthCny,
    totalWorthUsd,
    worthReady,
    refreshWorth,
  };
}
