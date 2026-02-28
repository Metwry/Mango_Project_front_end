<script setup>
import { ref } from "vue";
import TransactionsHistoryCard from "@/components/cards/bookkeepingCards/TransactionsHistoryCard.vue";
import AddTransaction from "@/components/windows/AddTransaction.vue";
import { useBookkeepingPage } from "@/composables/useBookkeepingPage";

const {
    accounts,
    accountsLoading,
    accountsError,
    transactions,
    transactionsTotal,
    txFilters,
    transactionsLoading,
    transactionsError,
    submitting,
    onPageChange,
    onPageSizeChange,
    onSearchChange,
    onSearchReset,
    onReverseTransaction,
    onSubmitTransaction,
} = useBookkeepingPage();

const showAddTransaction = ref(false);

async function handleSubmitTransaction(payload) {
    await onSubmitTransaction(payload);
    showAddTransaction.value = false;
}
</script>

<template>
    <div class="h-full w-full bg-gray-50 dark:bg-gray-900">
        <section class="h-full w-full overflow-hidden">
            <TransactionsHistoryCard :transactions="transactions" :accounts="accounts" :loading="transactionsLoading"
                :error="transactionsError" :page="txFilters.page" :page-size="txFilters.page_size" :total="transactionsTotal"
                @page-change="onPageChange" @page-size-change="onPageSizeChange" @reverse="onReverseTransaction"
                @search-change="onSearchChange" @search-reset="onSearchReset" @open-add-transaction="showAddTransaction = true" />
        </section>
    </div>

    <AddTransaction :is-open="showAddTransaction" :accounts="accounts" :accounts-loading="accountsLoading"
        :accounts-error="accountsError" :submitting="submitting" @close="showAddTransaction = false"
        @submit="handleSubmitTransaction" />
</template>
