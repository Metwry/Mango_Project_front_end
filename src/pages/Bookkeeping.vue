<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import TransactionsHistoryCard from "@/components/cards/bookkeepingCards/TransactionsHistoryCard.vue";
import AddTransactionCard from "@/components/cards/bookkeepingCards/AddTransactionCard.vue";
import { useAccountsStore } from "@/stores/accounts";
import { useTransactionsStore } from "@/stores/transaction";

const accountsStore = useAccountsStore();
const transactionsStore = useTransactionsStore();

const { accounts, loading: accountsLoading, error: accountsError } = storeToRefs(accountsStore);
const { items: transactions, loading: transactionsLoading, error: transactionsError } =
  storeToRefs(transactionsStore);

const submitting = ref(false);
const resetKey = ref(0);

onMounted(async () => {
  await Promise.all([accountsStore.fetchAccounts(), transactionsStore.fetchList()]);
});

async function onSubmitTransaction(payload) {
  submitting.value = true;
  try {
    await transactionsStore.createOne(payload);
    resetKey.value += 1;

    await Promise.all([
      accountsStore.fetchAccounts({ force: true }),
      transactionsStore.fetchList({ page: 1 }),
    ]);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="h-full w-full bg-gray-50 dark:bg-gray-900">
    <div class="h-full w-full">
      <div class="flex h-full w-full flex-col gap-4">
        <section class="h-[450px] w-full overflow-hidden">
          <AddTransactionCard
            :accounts="accounts"
            :accounts-loading="accountsLoading"
            :accounts-error="accountsError"
            :submitting="submitting"
            :reset-key="resetKey"
            @submit="onSubmitTransaction"
          />
        </section>

        <section class="h-[750px] w-full overflow-hidden">
          <TransactionsHistoryCard
            :transactions="transactions"
            :accounts="accounts"
            :loading="transactionsLoading"
            :error="transactionsError"
          />
        </section>
      </div>
    </div>
  </div>
</template>

