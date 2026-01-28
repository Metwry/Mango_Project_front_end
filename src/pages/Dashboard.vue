<script setup>
import { ref, onMounted } from 'vue'
import WorthCard from '@/components/cards/dashboardCards/WorthCard.vue'
import BudgetCard from '@/components/cards/dashboardCards/BudgetCard.vue'
import TrendCard from '@/components/cards/dashboardCards/TrendCard.vue'
import AccountListCard from '@/components/cards/dashboardCards/AccountListCard.vue'
import TransactionsCard from '@/components/cards/dashboardCards/TransactionsCard.vue'
import FundProportionCard from '@/components/cards/dashboardCards/FundProportionCard.vue'
import { getAccounts } from "@/utils/accounts.js"

//资金账户列表
const accounts = ref([])

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


//拿数据库数据
const fetchData = async () => {
    try {
        const { data } = await getAccounts() // 
        accounts.value = data

    } catch (err) {
        console.error('刷新失败', err)
    }
}
//页面加载
onMounted(() => {
    fetchData()
})
</script>

<template>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="md:col-span-2 h-90">
            <WorthCard :amount="netWorth" :change="monthlyChange" />
        </div>

        <div class="md:col-span-1 h-90">
            <BudgetCard :progress="budgetProgress" :remaining="budgetRemaining" />
        </div>

        <!-- todo->美化 -->
        <div class="md:col-span-1 h-90">
            <FundProportionCard :accounts="accounts" />
        </div>



        <div class="md:col-span-3">
            <TrendCard />
        </div>

        <div class="md:col-span-1">
            <AccountListCard :accounts="accounts" @refresh="fetchData" />
        </div>



        <div class="md:col-span-4">
            <TransactionsCard :transactions="recentTransactions" />
        </div>
    </div>
</template>
