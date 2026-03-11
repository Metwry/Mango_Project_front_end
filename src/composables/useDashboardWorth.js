import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useAccountsStore } from "@/stores/accounts";
import {
  buildAccountsValuation,
  ensureUsdPerCurrencyRates,
  getCachedUsdPerCurrencyRates,
  resolveUsdPerCurrencyRate,
} from "@/utils/fxRates";
import { useDashboardDisplayCurrency } from "@/composables/useDashboardDisplayCurrency";

const sharedValuedAccounts = ref([]);
const sharedTotalWorthCny = ref(0);
const sharedTotalWorthUsd = ref(0);
const sharedWorthReady = ref(false);
const sharedUsdPerCurrencyRates = ref(getCachedUsdPerCurrencyRates());

export function useDashboardWorth() {
  const accountsStore = useAccountsStore();
  const { accounts, fetched, lastFetchedAt } = storeToRefs(accountsStore);
  const { displayCurrency } = useDashboardDisplayCurrency();

  const valuedAccounts = sharedValuedAccounts;
  const totalWorthCny = sharedTotalWorthCny;
  const totalWorthUsd = sharedTotalWorthUsd;
  const worthReady = sharedWorthReady;
  const usdPerCurrencyRates = sharedUsdPerCurrencyRates;
  const totalWorthDisplayAmount = computed(() => {
    const usdRate = resolveUsdPerCurrencyRate(
      displayCurrency.value,
      usdPerCurrencyRates.value,
    );
    if (!Number.isFinite(usdRate) || usdRate <= 0) return 0;
    return Number(totalWorthUsd.value) / usdRate;
  });

  let syncToken = 0;

  const applyValuation = (rates = getCachedUsdPerCurrencyRates()) => {
    const result = buildAccountsValuation(accounts.value, rates);
    valuedAccounts.value = result.valuedAccounts;
    totalWorthCny.value = result.totalValueCny;
    totalWorthUsd.value = result.totalValueUsd;
    usdPerCurrencyRates.value = rates;
    worthReady.value = true;
  };

  const refreshWorth = async ({ forceRates = false } = {}) => {
    const token = ++syncToken;
    let nextRates = getCachedUsdPerCurrencyRates();

    try {
      nextRates = await ensureUsdPerCurrencyRates({ force: forceRates });
    } catch {
      // Keep previous rates when FX API is temporarily unavailable.
    }

    if (token !== syncToken) return;

    applyValuation(nextRates);
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

    void refreshWorth();
  });

  return {
    accounts,
    valuedAccounts,
    totalWorthCny,
    totalWorthUsd,
    totalWorthDisplayAmount,
    displayCurrency,
    usdPerCurrencyRates,
    worthReady,
  };
}
