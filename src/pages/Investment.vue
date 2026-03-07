<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import PositionCard from "@/components/cards/investmentCards/PositionCard.vue";
import AddPositionCard from "@/components/cards/investmentCards/AddPositionCard.vue";
import { isInvestmentAccount } from "@/utils/accounts";
import { useInvestmentStore } from "@/stores/investment";
import { useAccountsStore } from "@/stores/accounts";

const investmentStore = useInvestmentStore();
const accountsStore = useAccountsStore();
const { loading, error, positions } = storeToRefs(investmentStore);
const { accounts } = storeToRefs(accountsStore);
const investmentAccountId = computed(() => {
  const investmentAccount = (accounts.value || []).find((item) => isInvestmentAccount(item));
  const n = Number(investmentAccount?.id);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : "";
});

onMounted(() => {
  Promise.allSettled([
    investmentStore.fetchPositions(),
    accountsStore.fetchAccounts(),
  ]);
});
</script>

<template>
  <div class="h-full w-full bg-gray-50 dark:bg-gray-900">
    <section class="investment-scroll h-full w-full overflow-y-auto">
      <div v-if="loading" class="h-full grid place-items-center text-sm text-gray-500 dark:text-gray-400">
        正在加载持仓数据...
      </div>

      <div v-else-if="error" class="h-full grid place-items-center text-sm text-red-600 dark:text-red-400">
        持仓加载失败，请稍后重试。
      </div>

      <template v-else>
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 auto-rows-[minmax(24rem,_1fr)]">
          <PositionCard v-for="(position, index) in positions"
            :key="position.instrumentId || position.instrument_id || position.symbol || `${position.name}-${index}`"
            :position="position" :accounts="accounts" :investment-account-id="investmentAccountId" />
          <AddPositionCard :accounts="accounts" />
        </div>

        <div v-if="positions.length === 0" class="pt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          暂无持仓数据
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.investment-scroll {
  padding: 0.25rem;
  padding-bottom: calc(0.25rem + env(safe-area-inset-bottom));
}
</style>
