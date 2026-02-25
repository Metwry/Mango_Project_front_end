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

// 账户数据
const { accounts, loading, error } = storeToRefs(accountsStore);


// 账户总资金
const totalWorth = ref(190000.0)

const monthlyChange = ref(3.2)

// 每月预算
const budgetProgress = ref(88)
// 每月消费
const budgetRemaining = ref(4000)

// 最近活动记录




onMounted(() => {
    accountsStore.fetchAccounts();
});

</script>

<template>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 xl:grid-rows-[auto_1fr] gap-4 h-full">

        <div class="col-span-1 md:col-span-2 xl:col-span-2 min-h-[14rem]">
            <WorthCard :amount="totalWorth" :change="monthlyChange" class="h-full" />
        </div>
        <div class="col-span-1 md:col-span-1 xl:col-span-1 min-h-[14rem]">
            <BudgetCard :progress="budgetProgress" :remaining="budgetRemaining" class="h-full" />
        </div>
        <div class="col-span-1 md:col-span-1 xl:col-span-1 min-h-[14rem]">
            <FundProportionCard :accounts="accounts" class="h-full" />
        </div>

        <div class="col-span-1 md:col-span-2 xl:col-span-3 min-h-[30rem] xl:min-h-0 xl:h-full ">
            <TrendCard :accounts="accounts" class="h-full" />
        </div>
        <div class="col-span-1 md:col-span-2 xl:col-span-1 min-h-[30rem] xl:min-h-0 xl:h-full overflow-hidden">
            <AccountListCard :accounts="accounts" class="h-full" />
        </div>

    </div>
</template>
