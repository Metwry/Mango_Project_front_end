<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { toSafeNumber } from '@/utils/formatters'

const props = defineProps({
    accounts: { type: Array, default: () => [] },
})

use([CanvasRenderer, PieChart, TooltipComponent, LegendComponent, GridComponent])

const chartData = computed(() => {
    const data = (props.accounts || [])
        .map(acc => ({
            name: String(acc?.name ?? ''),
            value: Math.max(0, toSafeNumber(acc?.valueCny))
        }))
        .filter(x => x.name && x.value > 0)
        .sort((a, b) => b.value - a.value)

    if (data.length <= 5) return data

    const top5 = data.slice(0, 5)
    const others = data.slice(5).reduce((sum, item) => sum + item.value, 0)
    return [...top5, { name: '其他', value: others }]
})

const total = computed(() => chartData.value.reduce((sum, x) => sum + x.value, 0))
const animatedData = ref([])
const hasPlayedEnterAnimation = ref(false)
const lastDataSignature = ref('')
let rafId = null

const getDataSignature = (data) => {
    return data.map(item => `${item.name}:${Number(item.value).toFixed(4)}`).join('|')
}

const replayEnterAnimation = (nextData) => {
    if (rafId !== null) {
        cancelAnimationFrame(rafId)
    }

    animatedData.value = []
    rafId = requestAnimationFrame(() => {
        animatedData.value = nextData
        rafId = null
    })
}

watch(
    chartData,
    (nextData) => {
        const signature = getDataSignature(nextData)
        if (signature === lastDataSignature.value) return

        lastDataSignature.value = signature

        if (!nextData.length) {
            animatedData.value = []
            hasPlayedEnterAnimation.value = false
            return
        }

        if (!hasPlayedEnterAnimation.value) {
            replayEnterAnimation(nextData)
            hasPlayedEnterAnimation.value = true
            return
        }

        if (rafId !== null) {
            cancelAnimationFrame(rafId)
            rafId = null
        }
        animatedData.value = nextData
    },
    { immediate: true }
)

onUnmounted(() => {
    if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
    }
})

const option = computed(() => ({
    textStyle: {
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
    },
    color: ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#9ca3af'],
    tooltip: {
        trigger: 'item',
        formatter: '{b}: <b>{d}%</b>'
    },
    legend: {
        orient: 'horizontal',
        bottom: '0%',
        left: 'center',
        width: '90%',
        icon: 'circle',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 15,
        textStyle: {
            color: '#6b7280',
            fontSize: 12,
            width: 70,
            overflow: 'truncate'
        },
        formatter: (name) => name
    },
    series: [
        {
            name: '资金占比',
            type: 'pie',
            radius: '67%',
            center: ['50%', '35%'],
            avoidLabelOverlap: true,
            itemStyle: {
                borderRadius: 6,
                borderColor: '#fff',
                borderWidth: 2
            },
            label: {
                show: true,
                position: 'inside',
                formatter: '{d}%',
                fontSize: 11,
                fontWeight: 'bold',
                color: '#fff',
                textBorderColor: 'rgba(0,0,0,0.3)',
                textBorderWidth: 1
            },
            emphasis: {
                label: {
                    show: true,
                    fontSize: 14,
                    fontWeight: 'bold'
                }
            },
            data: animatedData.value
        }
    ]
}))
</script>

<template>
    <div class="card-base ">
        <div class="flex justify-between items-center mb-4">
            <h3 class="card-title">资金占比</h3>
        </div>

        <div v-if="total <= 0" class="flex-1 flex items-center justify-center text-gray-400">
            暂无账户数据
        </div>

        <div v-else class="h-[250px]">
            <v-chart class="w-full h-full" :option="option" autoresize />
        </div>
    </div>
</template>
