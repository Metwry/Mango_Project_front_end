<script setup>
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart } from 'echarts/charts'
import { GraphicComponent } from 'echarts/components'
import VChart from 'vue-echarts'

// 注册必须的组件
use([CanvasRenderer, PieChart, GraphicComponent])

const props = defineProps({
    progress: { type: Number, default: 0 },
    remaining: { type: Number, default: 0 }
})

const emit = defineEmits(['set-budget'])

// ECharts 配置项
const option = computed(() => ({
    // 渐变色定义
    color: [{
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
            { offset: 0, color: '#6366f1' }, // Indigo 500
            { offset: 1, color: '#4f46e5' }  // Indigo 600
        ]
    }, '#f3f4f6'],

    series: [
        {
            type: 'pie',
            radius: ['75%', '90%'], // 环形厚度
            center: ['50%', '50%'],
            silent: true, // 关闭鼠标交互，仅展示
            label: { show: false },
            data: [
                {
                    value: props.progress,
                    name: '已支出',
                    itemStyle: { borderRadius: 10 }
                },
                {
                    value: Math.max(0, 100 - props.progress),
                    name: '剩余',
                    itemStyle: { color: '#f3f4f6' }
                }
            ],
            // 动画效果
            animationDuration: 1500,
            animationEasing: 'cubicOut'
        }
    ],
    // 使用 graphic 在中间绘制文字
    graphic: {
        elements: [
            {
                type: 'text',
                left: 'center',
                top: '40%',
                style: {
                    text: `${props.progress}%`,
                    fill: '#374151',
                    fontSize: 28,
                    fontWeight: 'bold'
                }
            },
            {
                type: 'text',
                left: 'center',
                top: '60%',
                style: {
                    text: '已支出',
                    fill: '#9ca3af',
                    fontSize: 12
                }
            }
        ]
    }
}))

const handleSetBudget = () => {
    emit('set-budget')
}
</script>

<template>
    <div class="card-base flex flex-col items-center">
        <div class="flex justify-between items-center w-full mb-2">
            <h3 class="font-bold text-gray-700 dark:text-gray-200">本月预算</h3>
            <button @click="handleSetBudget" class="button-base">
                设置预算
            </button>
        </div>

        <div class="w-full h-[200px]">
            <v-chart :option="option" autoresize />
        </div>

        <div class="mt-2 text-center">
            <p class="text-sm text-gray-500 dark:text-gray-300">
                剩余额度:
                <span class="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                    ¥{{ remaining.toLocaleString() }}
                </span>
            </p>
        </div>
    </div>
</template>

<style scoped>
.card-base {
    padding: 1.25rem;
    min-width: 260px;
}
</style>