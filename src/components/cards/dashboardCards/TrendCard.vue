<template>
    <div class="card-base">
        <div class="flex justify-between items-center mb-6">
            <h3 class="font-bold text-gray-700 dark:text-gray-200 text-lg">资产走势 (近 6 个月)</h3>
            <div class="flex gap-2">
                <button
                    class="text-sm bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">近7天</button>
                <button
                    class="text-sm bg-primary-50 dark:bg-primary-500/20 text-primary-600 dark:text-primary-300 px-3 py-1.5 rounded-lg font-medium">近1月</button>
            </div>
        </div>
        <div
            class="flex-1 bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500">
            <div class="text-center">
                [ 这里集成 ECharts 折线图组件 ]
            </div>
        </div>
    </div>
</template>