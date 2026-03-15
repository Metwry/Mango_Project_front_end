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

const sharedWorthReady = ref(false);
const sharedUsdPerCurrencyRates = ref(getCachedUsdPerCurrencyRates());

// 提供仪表盘总资产相关的共享状态与刷新逻辑。
export function useDashboardWorth() {
  const accountsStore = useAccountsStore();
  const { accounts } = storeToRefs(accountsStore);
  const { displayCurrency } = useDashboardDisplayCurrency();

  const worthReady = sharedWorthReady;
  const usdPerCurrencyRates = sharedUsdPerCurrencyRates;
  // 根据账户列表和当前汇率计算估值结果。
  const valuation = computed(() => {
    return buildAccountsValuation(accounts.value, usdPerCurrencyRates.value);
  });
  // 返回带估值字段的账户列表。
  const valuedAccounts = computed(() => valuation.value.valuedAccounts);
  // 返回按人民币汇总后的总资产。
  const totalWorthCny = computed(() => valuation.value.totalValueCny);
  // 返回按美元汇总后的总资产。
  const totalWorthUsd = computed(() => valuation.value.totalValueUsd);
  // 根据当前展示币种，把总资产的美元值换算成页面展示金额。
  const totalWorthDisplayAmount = computed(() => {
    const usdRate = resolveUsdPerCurrencyRate(
      displayCurrency.value,
      usdPerCurrencyRates.value,
    );
    if (!Number.isFinite(usdRate) || usdRate <= 0) return 0;
    return Number(totalWorthUsd.value) / usdRate;
  });

  // 拉取最新汇率并更新共享汇率状态。
  const refreshWorth = async ({ forceRates = false } = {}) => {
    let nextRates = getCachedUsdPerCurrencyRates();

    try {
      nextRates = await ensureUsdPerCurrencyRates({ force: forceRates });
    } catch {
      // Keep previous rates when FX API is temporarily unavailable.
    }

    usdPerCurrencyRates.value = nextRates;
    worthReady.value = true;
  };

  watch(
    accounts,
    (next, prev) => {
      if (next === prev) return;
      void refreshWorth();
    },
  );

  onMounted(async () => {
    try {
      await accountsStore.fetchAccounts();
    } catch {
      // API layer already handles visible error feedback.
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
