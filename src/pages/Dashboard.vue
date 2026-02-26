<script setup>
import WorthCard from '@/components/cards/dashboardCards/WorthCard.vue'
import TrendCard from '@/components/cards/dashboardCards/TrendCard.vue'
import AccountListCard from '@/components/cards/dashboardCards/AccountListCard.vue'
import FundProportionCard from '@/components/cards/dashboardCards/FundProportionCard.vue'
import { ref } from 'vue'
import { useDashboardWorth } from '@/composables/useDashboardWorth'

const { accounts, valuedAccounts, totalWorthCny, worthReady } = useDashboardWorth()

const monthlyChange = ref(3.2)
</script>

<template>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 xl:grid-rows-[auto_1fr] gap-4 h-full min-h-0">

        <div class="col-span-1 md:col-span-1 xl:col-span-3 min-h-[16rem]">
            <WorthCard :amount="totalWorthCny" :change="monthlyChange" :ready="worthReady" class="h-full" />
        </div>
        <div class="col-span-1 md:col-span-1 xl:col-span-1 min-h-[16rem]">
            <FundProportionCard :accounts="valuedAccounts" class="h-full" />
        </div>

        <div class="col-span-1 md:col-span-2 xl:col-span-3 min-h-[30rem] xl:min-h-0 xl:h-full ">
            <TrendCard :accounts="accounts" class="h-full" />
        </div>
        <div class="col-span-1 md:col-span-2 xl:col-span-1 min-h-[30rem] xl:min-h-0 xl:h-full overflow-hidden">
            <AccountListCard :accounts="valuedAccounts" class="h-full" />
        </div>

    </div>
</template>
