<script setup>
import { computed } from 'vue'
import { DASHBOARD_WORTH_CONFIG } from '@/config/Config'

const props = defineProps({
    amount: { type: Number, required: true },
    ready: { type: Boolean, default: true }
})

const safeAmount = computed(() => {
    const n = Number(props.amount)
    return Number.isFinite(n) ? n : 0
})

const amountLabel = computed(() => {
    if (!props.ready) return '--'
    return new Intl.NumberFormat(DASHBOARD_WORTH_CONFIG.displayLocale, {
        style: 'currency',
        currency: DASHBOARD_WORTH_CONFIG.displayCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(safeAmount.value)
})
</script>

<template>
    <div class="card-base relative overflow-hidden">
        <div class="pointer-events-none absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20">
        </div>

        <div class="relative z-10">
            <div class="card-title">&#24635;&#36164;&#20135;</div>

            <h2 v-if="!ready"
                class="mb-4 h-[3.8rem] text-5xl font-bold tracking-tight leading-none amount-line text-gray-500"
                aria-label="loading">
                &#165;--.--</h2>

            <h2 v-else class="mb-4 h-[3.8rem] text-5xl font-bold tracking-tight leading-none amount-line"
                :aria-label="amountLabel">
                {{ amountLabel }}
            </h2>


        </div>
    </div>
</template>

<style scoped>
.amount-line {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}
</style>

