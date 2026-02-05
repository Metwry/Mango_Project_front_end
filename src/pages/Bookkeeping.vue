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

onMounted(() => Promise.all([accountsStore.fetchAccounts(), transactionsStore.fetchList()]));

function updateAndFetch(patch) {
    transactionsStore.setFilters(patch);
    return transactionsStore.fetchList(patch);
}

function onPageChange(page) {
    return updateAndFetch({ page });
}

function onPageSizeChange(page_size) {
    return updateAndFetch({ page: 1, page_size });
}

function onSearchChange(filters) {
    return updateAndFetch({ page: 1, ...filters });
}

function onSearchReset() {
    transactionsStore.setFilters({
        page: 1,
        account_id: null,
        counterparty: null,
        category: null,
        start: null,
        end: null,
        search: "",
    });
    return transactionsStore.fetchList({ page: 1 });
}

async function onReverseTransaction(id) {
    submitting.value = true;
    try {
        await transactionsStore.reverseOne(id);
        await accountsStore.fetchAccounts({ force: true });
    } finally {
        submitting.value = false;
    }
}

async function onSubmitTransaction(payload) {
    submitting.value = true;
    try {
        await transactionsStore.createOne(payload);
        resetKey.value += 1;

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
                <section class="h-100 w-full overflow-hidden">
                    <AddTransactionCard :accounts="accounts" :accounts-loading="accountsLoading"
                        :accounts-error="accountsError" :submitting="submitting" :reset-key="resetKey"
                        @submit="onSubmitTransaction" />
                </section>

                <section class="h-[850px] w-full overflow-hidden">
                    <TransactionsHistoryCard :transactions="transactions" :accounts="accounts"
                        :loading="transactionsLoading" :error="transactionsError" :page="txFilters.page"
                        :page-size="txFilters.page_size" :total="transactionsTotal" @page-change="onPageChange"
                        @page-size-change="onPageSizeChange" @reverse="onReverseTransaction"
                        @search-change="onSearchChange" @search-reset="onSearchReset" />
                </section>
            </div>
        </div>
    </div>
</template>
