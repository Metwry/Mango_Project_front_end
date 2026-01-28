<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
    accounts: { type: Array, default: () => [] },
})

const hoveredName = ref(null)

const toPositive = (val) => {
    const num = Number(val)
    if (!Number.isFinite(num)) return 0
    return Math.max(0, num)
}

const rows = computed(() => {
    return (props.accounts || [])
        .map((acc) => {
            const name = String(acc?.name ?? '')
            return {
                name,
                value: toPositive(acc?.balance ?? 0),
            }
        })
        .filter((x) => x.name)
})

const total = computed(() => rows.value.reduce((sum, x) => sum + toPositive(x.value), 0))

const palette = [
    '#4f46e5', // primary-600
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ec4899', // pink-500
    '#8b5cf6', // violet-500
    '#06b6d4', // cyan-500
    '#ef4444', // red-500
]

const hashString = (str) => {
    let hash = 0
    for (let i = 0; i < str.length; i += 1) {
        hash = (hash * 31 + str.charCodeAt(i)) >>> 0
    }
    return hash
}

const colorForName = (name) => {
    if (!name) return '#d1d5db'
    return palette[hashString(name) % palette.length]
}

const sortedRows = computed(() => {
    return [...rows.value].sort((a, b) => toPositive(b.value) - toPositive(a.value))
})

const top5 = computed(() => sortedRows.value.slice(0, 5))

const otherValue = computed(() => {
    const rest = sortedRows.value.slice(5)
    return rest.reduce((sum, x) => sum + toPositive(x.value), 0)
})

const legendItems = computed(() => {
    const head = top5.value.map((x) => {
        const value = toPositive(x.value)
        return {
            name: x.name,
            ratio: total.value > 0 ? value / total.value : 0,
            color: colorForName(x.name),
            placeholder: false,
        }
    })

    while (head.length < 5) {
        head.push({
            name: '',
            ratio: 0,
            color: colorForName(''),
            placeholder: true,
        })
    }

    head.push({
        name: '其他',
        ratio: total.value > 0 ? otherValue.value / total.value : 0,
        color: '#9ca3af',
        placeholder: false,
    })

    return head
})

const pieSegments = computed(() => {
    if (total.value <= 0) return []

    const segs = top5.value
        .map((x) => {
            const value = toPositive(x.value)
            return {
                name: x.name,
                value,
                ratio: total.value > 0 ? value / total.value : 0,
                color: colorForName(x.name),
            }
        })
        .filter((x) => x.value > 0)

    if (otherValue.value > 0) {
        segs.push({
            name: '其他',
            value: otherValue.value,
            ratio: total.value > 0 ? otherValue.value / total.value : 0,
            color: '#9ca3af',
        })
    }

    return segs
})

const ring = computed(() => {
    const r = 54
    const c = 2 * Math.PI * r
    let accLen = 0

    return pieSegments.value.map((item, idx) => {
        const len = c * item.ratio
        const dasharray = `${len} ${Math.max(0, c - len)}`
        const dashoffset = -accLen
        accLen += len

        const isHovered = hoveredName.value && hoveredName.value === item.name
        const dimmed = hoveredName.value && !isHovered

        return {
            key: `${item.name}-${idx}`,
            name: item.name,
            dasharray,
            dashoffset,
            color: item.color,
            opacity: dimmed ? 0.25 : 1,
        }
    })
})
</script>

<template>
    <div
        class="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-full">
        <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-gray-700 dark:text-gray-200">资金占比</h3>
        </div>

        <div v-if="total <= 0" class="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
            暂无账户数据
        </div>

        <div v-else class="flex-1 flex flex-col gap-5">
            <div class="flex items-center justify-center">
                <div class="relative w-44 h-44">
                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                        <circle cx="80" cy="80" r="54" stroke="#f3f4f6" stroke-width="16" fill="none" />
                        <circle v-for="seg in ring" :key="seg.key" cx="80" cy="80" r="54" :stroke="seg.color"
                            stroke-width="16" fill="none" :stroke-dasharray="seg.dasharray"
                            :stroke-dashoffset="seg.dashoffset" :opacity="seg.opacity"
                            class="transition-opacity duration-200" />
                    </svg>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-x-6 gap-y-3">
                <div v-for="(item, idx) in legendItems" :key="`${item.name || 'empty'}-${idx}`"
                    class="flex items-center justify-between gap-3 min-w-0"
                    :class="item.placeholder ? 'opacity-35' : ''"
                    @mouseenter="item.name ? (hoveredName = item.name) : null" @mouseleave="hoveredName = null">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: item.color }" />
                        <p class="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate cursor-pointer">
                            <span v-if="item.name">{{ item.name }}</span>
                            <span v-else>&nbsp;</span>
                        </p>
                    </div>

                    <p class="text-xs font-bold text-gray-700 dark:text-gray-200 shrink-0">
                        {{ Math.round(item.ratio * 100) }}%
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>
