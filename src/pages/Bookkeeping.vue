<script setup>
import { ref } from "vue";
import TransactionsHistoryCard from "@/components/cards/bookkeepingCards/TransactionsHistoryCard.vue";
import AddTransaction from "@/components/modals/AddTransaction.vue";
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
    deletingId,
    clearingAll,
    onPageChange,
    onPageSizeChange,
    onSearchChange,
    onSearchReset,
    onModeChange,
    onDeleteOne,
    onDeleteAll,
    onReverseTransaction,
    onSubmitTransaction,
} = useBookkeepingPage();

const showAddTransaction = ref(false);

// 提交新增交易后关闭弹窗。
async function handleSubmitTransaction(payload) {
    await onSubmitTransaction(payload);
    showAddTransaction.value = false;
}
</script>

<template>

    <div class="h-full w-full min-w-0">
        <section class="h-full w-full min-w-0 overflow-hidden">
            <TransactionsHistoryCard :transactions="transactions" :accounts="accounts" :loading="transactionsLoading"
                :error="transactionsError" :page="txFilters.page" :page-size="txFilters.page_size"
                :total="transactionsTotal" :history-mode="txFilters.history_mode" :deleting-id="deletingId"
                :clearing-all="clearingAll" @page-change="onPageChange"
                @page-size-change="onPageSizeChange"
                @reverse="onReverseTransaction" @search-change="onSearchChange" @search-reset="onSearchReset"
                @mode-change="onModeChange" @delete-one="onDeleteOne" @delete-all="onDeleteAll"
                @open-add-transaction="showAddTransaction = true" />
        </section>
        <AddTransaction :is-open="showAddTransaction" :accounts="accounts" :accounts-loading="accountsLoading"
            :accounts-error="accountsError" :submitting="submitting" @close="showAddTransaction = false"
            @submit="handleSubmitTransaction" />
    </div>
</template>
