    <script setup>
    import { computed } from 'vue'
    import { use } from 'echarts/core'
    import { CanvasRenderer } from 'echarts/renderers'
    import { PieChart } from 'echarts/charts'
    import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
    import VChart from 'vue-echarts'


    const props = defineProps({
        accounts: { type: Array, default: () => [] },
    })

    // 注册必须的组件
    use([CanvasRenderer, PieChart, TooltipComponent, LegendComponent, GridComponent])

    // 处理数据逻辑（保持和你之前一致）
    const chartData = computed(() => {
        const data = (props.accounts || [])
            .map(acc => ({
                name: String(acc?.name ?? ''),
                value: Math.max(0, Number(acc?.balance ?? 0))
            }))
            .filter(x => x.name && x.value > 0)
            .sort((a, b) => b.value - a.value)

        if (data.length <= 5) return data

        const top5 = data.slice(0, 5)
        const others = data.slice(5).reduce((sum, item) => sum + item.value, 0)
        return [...top5, { name: '其他', value: others }]
    })

    const total = computed(() => chartData.value.reduce((sum, x) => sum + x.value, 0))

    // ECharts 配置项
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
            orient: 'horizontal', // 保持横向
            bottom: '0%',         // 距离底部高度
            left: 'center',
            width: '90%',         // 给足宽度，确保能横着排
            icon: 'circle',
            itemWidth: 10,
            itemHeight: 10,
            itemGap: 15,          // 缩小间距，确保一行能塞下 3 个
            textStyle: {
                color: '#6b7280',
                fontSize: 12,
                // 关键：给图例文字固定宽度，确保 3 个账户能平分一行
                width: 70,
                overflow: 'truncate' // 名字太长自动打点
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
                // --- 关键修改：显示标签 ---
                label: {
                    show: true,
                    position: 'inside', // 在扇形内部显示
                    formatter: '{d}%',  // {d} 代表百分比
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: '#fff',      // 文字颜色设为白色，在彩色扇形中更清晰
                    textBorderColor: 'rgba(0,0,0,0.3)', // 加个极细的描边，增加可读性
                    textBorderWidth: 1
                },
                // 鼠标悬停时的高亮样式
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: 'bold'
                    }
                },
                data: chartData.value
            }
        ]
    }))
</script>

    <template>
        <div class="card-base">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-gray-700 dark:text-gray-200">资金占比</h3>
            </div>

            <div v-if="total <= 0" class="flex-1 flex items-center justify-center text-gray-400">
                暂无账户数据
            </div>

            <div v-else class="flex-1 h-[350px]">
                <v-chart :option="option" autoresize />
            </div>
        </div>
    </template>

