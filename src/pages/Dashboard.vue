<script setup>
import WorthCard from '@/components/cards/dashboardCards/WorthCard.vue'
import BudgetCard from '@/components/cards/dashboardCards/BudgetCard.vue'
import TrendCard from '@/components/cards/dashboardCards/TrendCard.vue'
import AccountListCard from '@/components/cards/dashboardCards/AccountListCard.vue'
import ActivityCard from '@/components/cards/dashboardCards/ActivityCard.vue'
import FundProportionCard from '@/components/cards/dashboardCards/FundProportionCard.vue'
import { ref, onMounted } from 'vue'
import { useAccountsStore } from '@/stores/accounts'
import { storeToRefs } from "pinia";



const accountsStore = useAccountsStore();
const { accounts, loading, error } = storeToRefs(accountsStore);

const netWorth = ref(190000.0)
const monthlyChange = ref(3.2)
const budgetProgress = ref(88)
const budgetRemaining = ref(4000)


const recentTransactions = ref([
    { id: 1, title: 'Apple Store', date: '2026-01-09', category: '', amount: -8999, type: 'expense' },
    { id: 2, title: '', date: '2026-01-05', category: '', amount: 25000, type: 'income' },
    { id: 3, title: '', date: '2026-01-04', category: '', amount: -35, type: 'expense' },
    { id: 4, title: '', date: '2026-01-02', category: '', amount: 1200, type: 'income' },
])



onMounted(() => {
    accountsStore.fetchAccounts();
});

</script>

<template>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        <!-- todo -->
        <div class="col-span-1 md:col-span-2 xl:col-span-2 h-auto min-h-[20rem]">
            <WorthCard :amount="netWorth" :change="monthlyChange" />
        </div>
        <!-- todo -->
        <div class="col-span-1 md:col-span-1 xl:col-span-1 h-auto min-h-[20rem]">
            <BudgetCard :progress="budgetProgress" :remaining="budgetRemaining" />
        </div>
        <div class="col-span-1 md:col-span-1 xl:col-span-1 h-auto min-h-[20rem]">
            <FundProportionCard v-if="!loading && !error" :accounts="accounts" />
            <div v-else class="card-base items-center justify-center text-gray-400">
                <span v-if="error" class="text-sm text-red-500">Failed to load accounts</span>
                <span v-else class="text-sm">Loading accounts...</span>
            </div>
        </div>
        <!-- todo -->
        <div class="col-span-1 md:col-span-2 xl:col-span-3 min-h-[24rem]">
            <TrendCard :accounts="accounts" />
        </div>

        <div class="col-span-1 md:col-span-2 xl:col-span-1 h-auto min-h-[24rem]">
            <AccountListCard :accounts="accounts" />
        </div>
        <!-- todo -->
        <div class="col-span-1 md:col-span-2 xl:col-span-4">
            <ActivityCard :transactions="recentTransactions" />
        </div>
    </div>
</template>
