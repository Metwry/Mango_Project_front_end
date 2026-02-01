<script setup>
import { ref } from 'vue'
import TransactionsHistoryCard from '@/components/cards/bookkeepingCards/TransactionsHistoryCard.vue';
import AddTransactionCard from '@/components/cards/bookkeepingCards/AddTransactionCard.vue';


defineProps({

    Accounts: { type: Array, default: () => [] },
    Transactions: { type: Array, default: () => [] }

})

</script>

<template>
    <!-- 占满视口：高全屏 + 宽全屏 -->
    <div class="h-full w-full bg-gary-50 dark:bg-gray-900 ">
        <!-- 内容区：宽度占满，仅保留内边距 -->
        <div class="h-full w-full ">
            <div class="flex h-full w-hull flex-col gap-4">
                <!-- 上：新增交易（固定高度） -->
                <section class="h-[450px] w-full overflow-hidden">
                    <AddTransactionCard />
                </section>

                <!-- 下：交易历史（固定高度 + 内部滚动） -->
                <section class="h-[750px] w-full overflow-hidden">
                    <TransactionsHistoryCard />
                </section>
            </div>
        </div>
    </div>
</template>
