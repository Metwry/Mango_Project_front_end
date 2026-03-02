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
    <div class="grid h-full min-h-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4 xl:grid-rows-[auto_minmax(0,1fr)]">
        <div class="col-span-1 sm:col-span-2 xl:col-span-3 min-h-[14rem] sm:min-h-[16rem]">
            <WorthCard :amount="totalWorthCny" :change="monthlyChange" :ready="worthReady" class="h-full" />
        </div>
        <div class="col-span-1 sm:col-span-2 xl:col-span-1 min-h-[14rem] sm:min-h-[16rem]">
            <FundProportionCard :accounts="valuedAccounts" class="h-full" />
        </div>

        <div class="col-span-1 sm:col-span-2 xl:col-span-3 min-h-[22rem] sm:min-h-[26rem] xl:min-h-0 xl:h-full">
            <TrendCard :accounts="accounts" class="h-full" />
        </div>
        <div class="col-span-1 sm:col-span-2 xl:col-span-1 min-h-[20rem] sm:min-h-[24rem] xl:min-h-0 xl:h-full overflow-hidden">
            <AccountListCard :accounts="valuedAccounts" class="h-full" />
        </div>
    </div>
</template>
