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

const {
    items: transactions,
    total: transactionsTotal,
    filters: txFilters,
    loading: transactionsLoading,
    error: transactionsError,
} = storeToRefs(transactionsStore);

const submitting = ref(false);
const resetKey = ref(0);

onMounted(async () => {
    await Promise.all([accountsStore.fetchAccounts(), transactionsStore.fetchList()]);
});

function onPageChange(page) {
    transactionsStore.setFilters({ page });
    return transactionsStore.fetchList({ page });
}

function onPageSizeChange(pageSize) {
    transactionsStore.setFilters({ page: 1, page_size: pageSize });
    return transactionsStore.fetchList({ page: 1, page_size: pageSize });
}

async function onReverseTransaction(id) {
    // 用 submitting 复用也行；想区分可以另建 reversing 状态
    submitting.value = true;
    try {
        await transactionsStore.reverseOne(id);

        // 冲正会影响余额，刷新账户
        await accountsStore.fetchAccounts({ force: true });

        // 可选：冲正后保持当前页（reverseOne 已经刷新当前页了）
    } finally {
        submitting.value = false;
    }
}

async function onSubmitTransaction(payload) {
    submitting.value = true;
    try {
        await transactionsStore.createOne(payload);
        resetKey.value += 1;

        // 新增后回到第一页看最新，并同步 filters
        transactionsStore.setFilters({ page: 1 });

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
                <section class="h-[350px] w-full overflow-hidden">
                    <AddTransactionCard :accounts="accounts" :accounts-loading="accountsLoading"
                        :accounts-error="accountsError" :submitting="submitting" :reset-key="resetKey"
                        @submit="onSubmitTransaction" />
                </section>

                <section class="h-[850px] w-full overflow-hidden">
                    <TransactionsHistoryCard :transactions="transactions" :accounts="accounts"
                        :loading="transactionsLoading" :error="transactionsError" :page="txFilters.page"
                        :page-size="txFilters.page_size" :total="transactionsTotal" @page-change="onPageChange"
                        @page-size-change="onPageSizeChange" @reverse="onReverseTransaction" />
                </section>
            </div>
        </div>
    </div>
</template>
