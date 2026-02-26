<script setup>
import TransactionsHistoryCard from "@/components/cards/bookkeepingCards/TransactionsHistoryCard.vue";
import AddTransactionCard from "@/components/cards/bookkeepingCards/AddTransactionCard.vue";
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
    resetKey,
    onPageChange,
    onPageSizeChange,
    onSearchChange,
    onSearchReset,
    onReverseTransaction,
    onSubmitTransaction,
} = useBookkeepingPage();
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
