<script setup>
import { computed } from 'vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import RollingDigit from '@/components/ui/RollingDigit.vue'
import { DASHBOARD_WORTH_CONFIG } from '@/config/Config'
import { useDashboardDisplayCurrency } from '@/composables/useDashboardDisplayCurrency'
import { formatCurrencyAmount, getCurrencySymbol } from '@/utils/formatters'

const props = defineProps({
    amount: { type: Number, required: true },
    ready: { type: Boolean, default: true }
})

const {
    displayCurrency,
    displayCurrencyMeta,
    nextDisplayCurrencyMeta,
    cycleDisplayCurrency
} = useDashboardDisplayCurrency()

const safeAmount = computed(() => {
    const n = Number(props.amount)
    return Number.isFinite(n) ? n : 0
})

const absoluteAmount = computed(() => Math.abs(safeAmount.value))
const isNegative = computed(() => safeAmount.value < 0)
const currencySymbol = computed(() => {
    return getCurrencySymbol(displayCurrency.value) || `${displayCurrency.value} `
})

const amountLabel = computed(() => {
    if (!props.ready) return '--'
    return formatCurrencyAmount(safeAmount.value, displayCurrency.value, {
        locale: DASHBOARD_WORTH_CONFIG.displayLocale,
        fallbackWithCode: true,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
})

const amountParts = computed(() => {
    const [integerPart, fractionPart = '00'] = absoluteAmount.value.toFixed(2).split('.')
    const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    const integerDigits = groupedInteger.replace(/,/g, '')

    const integerTokens = []
    let consumed = 0

    groupedInteger.split('').forEach((char, index) => {
        if (/\d/.test(char)) {
            const placeFromRight = integerDigits.length - consumed - 1
            integerTokens.push({
                type: 'digit',
                key: `int-${placeFromRight}`,
                digit: Number(char),
                delay: 0
            })
            consumed += 1
            return
        }

        integerTokens.push({
            type: 'separator',
            key: `sep-${index}-${char}`,
            char
        })
    })

    const fractionTokens = fractionPart.split('').map((char, index) => ({
        key: `frac-${index}`,
        digit: Number(char),
        delay: 0
    }))

    return { integerTokens, fractionTokens }
})
</script>

<template>
    <div class="card-base relative overflow-hidden">
        <div class="pointer-events-none absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20">
        </div>

        <div class="relative z-10">
            <div class="mb-2 flex items-center  gap-5 sm:mb-3 sm:gap-6">
                <div class="card-title !mb-0">总资产</div>
                <button type="button"
                    class="inline-flex h-6 w-6  items-center justify-center rounded-full   cursor-pointer"
                    :title="`切换显示币种：${displayCurrencyMeta.label} -> ${nextDisplayCurrencyMeta.label}`"
                    :aria-label="`切换显示币种，当前${displayCurrencyMeta.label}`"
                    @click="cycleDisplayCurrency">
                    <BaseIcon name="switchHorizontal" :size="18" />
                </button>
            </div>

            <div class="mb-2 overflow-x-auto overflow-y-hidden pb-1 sm:mb-4 sm:pb-0">
                <h2 v-if="!ready"
                    class="h-[3.2rem] min-w-max text-[2.8rem] font-bold tracking-tight leading-none amount-line text-gray-500 sm:h-[3.8rem] sm:text-5xl"
                    aria-label="loading">
                    {{ currencySymbol }}--.--</h2>

                <h2 v-else class="h-[3.2rem] min-w-max text-[2.8rem] font-bold tracking-tight leading-none amount-line sm:h-[3.8rem] sm:text-5xl"
                    :aria-label="amountLabel">
                    <span v-if="isNegative" class="amount-separator">-</span>
                    <span class="amount-separator currency-symbol">{{ currencySymbol }}</span>

                    <template v-for="token in amountParts.integerTokens" :key="token.key">
                        <RollingDigit v-if="token.type === 'digit'" :digit="token.digit" :delay="token.delay" />
                        <span v-else class="amount-separator">{{ token.char }}</span>
                    </template>

                    <span class="amount-separator decimal-dot">.</span>

                    <RollingDigit v-for="token in amountParts.fractionTokens" :key="token.key" :digit="token.digit"
                        :delay="token.delay" />
                </h2>
            </div>
        </div>
    </div>
</template>

<style scoped>
.amount-line {
    display: inline-flex;
    align-items: flex-start;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.amount-separator {
    display: inline-flex;
    align-items: flex-start;
    line-height: 1;
}

.currency-symbol {
    margin-right: 0.08em;
}

.decimal-dot {
    padding: 0 0.03em;
}
</style>
