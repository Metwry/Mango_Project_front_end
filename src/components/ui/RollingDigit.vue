<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
    digit: { type: Number, required: true },
    duration: { type: Number, default: 560 },
    delay: { type: Number, default: 0 },
    animateOnMount: { type: Boolean, default: true }
})

const STRIP_BASE_OFFSET = 20
const STRIP_LENGTH = 60
const stripDigits = Array.from({ length: STRIP_LENGTH }, (_, idx) => String(idx % 10))

const currentDigit = ref(0)
const translateStep = ref(STRIP_BASE_OFFSET)
const isAnimating = ref(false)
const hasInitialized = ref(false)
let resetTimer = null

const normalizeDigit = (value) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return 0
    return ((Math.trunc(n) % 10) + 10) % 10
}

const clearResetTimer = () => {
    if (!resetTimer) return
    clearTimeout(resetTimer)
    resetTimer = null
}

const settleAtTarget = (target) => {
    isAnimating.value = false
    currentDigit.value = target
    translateStep.value = STRIP_BASE_OFFSET + target
}

watch(
    () => props.digit,
    async (next) => {
        const target = normalizeDigit(next)
        if (!hasInitialized.value && !props.animateOnMount) {
            hasInitialized.value = true
            settleAtTarget(target)
            return
        }

        const from = hasInitialized.value ? currentDigit.value : 0
        clearResetTimer()

        if (hasInitialized.value && target === from) {
            settleAtTarget(target)
            return
        }

        const start = STRIP_BASE_OFFSET + from
        const delta = (target - from + 10) % 10
        const spinSteps = delta + 10

        isAnimating.value = false
        translateStep.value = start

        await nextTick()
        requestAnimationFrame(() => {
            isAnimating.value = true
            translateStep.value = start + spinSteps
        })

        resetTimer = setTimeout(() => {
            settleAtTarget(target)
        }, props.duration + props.delay + 40)

        hasInitialized.value = true
    },
    { immediate: true }
)

onUnmounted(() => {
    clearResetTimer()
})

const trackStyle = computed(() => ({
    transform: `translateY(-${translateStep.value}em)`,
    transitionDuration: `${props.duration}ms`,
    transitionDelay: `${props.delay}ms`
}))
</script>

<template>
    <span class="rolling-digit-window">
        <span class="rolling-digit-track" :class="{ 'is-animating': isAnimating }" :style="trackStyle">
            <span v-for="(n, idx) in stripDigits" :key="idx" class="rolling-digit-item">
                {{ n }}
            </span>
        </span>
    </span>
</template>

<style scoped>
.rolling-digit-window {
    width: 0.62em;
    height: 1em;
    overflow: hidden;
    display: inline-flex;
    align-items: flex-start;
    justify-content: center;
}

.rolling-digit-track {
    display: flex;
    flex-direction: column;
    will-change: transform;
    transition-property: none;
}

.rolling-digit-track.is-animating {
    transition-property: transform;
    transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

.rolling-digit-item {
    height: 1em;
    line-height: 1em;
    text-align: center;
}
</style>
