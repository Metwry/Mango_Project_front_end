import { onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useAccountsStore } from "@/stores/accounts";
import { getPayload } from "@/utils/apiPayload";
import { getUsdExchangeRates } from "@/utils/exchangeRates";
import {
  buildAccountsValuation,
  DEFAULT_USD_PER_CURRENCY_RATES,
  normalizeUsdPerCurrencyRates,
} from "@/utils/fxRates";

let sharedUsdPerCurrencyRates = { ...DEFAULT_USD_PER_CURRENCY_RATES };
let sharedRatesFetchedAt = 0;
const sharedValuedAccounts = ref([]);
const sharedTotalWorthCny = ref(0);
const sharedTotalWorthUsd = ref(0);
const sharedWorthReady = ref(false);
const FX_RATES_STALE_MS = 10 * 60 * 1000;

export function useDashboardWorth() {
  const accountsStore = useAccountsStore();
  const { accounts, fetched, lastFetchedAt } = storeToRefs(accountsStore);

  const valuedAccounts = sharedValuedAccounts;
  const totalWorthCny = sharedTotalWorthCny;
  const totalWorthUsd = sharedTotalWorthUsd;
  const worthReady = sharedWorthReady;

  let syncToken = 0;

  const applyValuation = (rates = sharedUsdPerCurrencyRates) => {
    const result = buildAccountsValuation(accounts.value, rates);
    valuedAccounts.value = result.valuedAccounts;
    totalWorthCny.value = result.totalValueCny;
    totalWorthUsd.value = result.totalValueUsd;
    worthReady.value = true;
  };

  const hasFreshRates = () =>
    sharedRatesFetchedAt > 0 &&
    Date.now() - sharedRatesFetchedAt < FX_RATES_STALE_MS;

  const refreshWorth = async ({ forceRates = false } = {}) => {
    const token = ++syncToken;
    let nextRates = sharedUsdPerCurrencyRates;
    const shouldFetchRates = forceRates || !hasFreshRates();
    let fetchedRates = false;

    if (shouldFetchRates) {
      try {
        const res = await getUsdExchangeRates();
        const payload = getPayload(res, {});
        nextRates = {
          ...nextRates,
          ...normalizeUsdPerCurrencyRates(payload),
          USD: 1,
        };
        fetchedRates = true;
      } catch {
        // Keep previous rates when FX API is temporarily unavailable.
      }
    }

    if (token !== syncToken) return;

    if (shouldFetchRates) {
      sharedUsdPerCurrencyRates = nextRates;
      if (fetchedRates) {
        sharedRatesFetchedAt = Date.now();
      }
    }

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

    void refreshWorth();
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
