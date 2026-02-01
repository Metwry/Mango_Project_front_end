<script setup>
import { ref, onMounted } from 'vue'
import WorthCard from '@/components/cards/dashboardCards/WorthCard.vue'
import BudgetCard from '@/components/cards/dashboardCards/BudgetCard.vue'
import TrendCard from '@/components/cards/dashboardCards/TrendCard.vue'
import AccountListCard from '@/components/cards/dashboardCards/AccountListCard.vue'
import ActivityCard from '@/components/cards/dashboardCards/ActivityCard.vue'
import FundProportionCard from '@/components/cards/dashboardCards/FundProportionCard.vue'
import { useAccountsStore } from '@/stores/accounts'
import { storeToRefs } from "pinia";


//资金账户列表
const accountsStore = useAccountsStore();
const { accounts, loading, error } = storeToRefs(accountsStore);

const netWorth = ref(190000.0)
const monthlyChange = ref(3.2)
const budgetProgress = ref(88)
const budgetRemaining = ref(4000)

//资金活动记录
const recentTransactions = ref([
    { id: 1, title: 'Apple Store', date: '2026-01-09', category: '数码', amount: -8999, type: 'expense' },
    { id: 2, title: '工资收入', date: '2026-01-05', category: '工资', amount: 25000, type: 'income' },
    { id: 3, title: '星巴克', date: '2026-01-04', category: '餐饮', amount: -35, type: 'expense' },
    { id: 4, title: '股票分红', date: '2026-01-02', category: '理财', amount: 1200, type: 'income' },
])


//页面加载
onMounted(() => {
    accountsStore.fetchAccounts();
});

</script>

<template>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">

        <div class="col-span-1 md:col-span-2 xl:col-span-2 h-auto min-h-[20rem]">
            <WorthCard :amount="netWorth" :change="monthlyChange" />
        </div>

        <div class="col-span-1 md:col-span-1 xl:col-span-1 h-auto min-h-[20rem]">
            <BudgetCard :progress="budgetProgress" :remaining="budgetRemaining" />
        </div>

        <div class="col-span-1 md:col-span-1 xl:col-span-1 h-auto min-h-[20rem]">
            <FundProportionCard :accounts="accounts" />
        </div>

        <div class="col-span-1 md:col-span-2 xl:col-span-3 min-h-[24rem]">
            <TrendCard />
        </div>

        <div class="col-span-1 md:col-span-2 xl:col-span-1 h-auto min-h-[24rem]">
            <AccountListCard :accounts="accounts" />
        </div>

        <div class="col-span-1 md:col-span-2 xl:col-span-4">
            <ActivityCard :transactions="recentTransactions" />
        </div>
    </div>
</template>
