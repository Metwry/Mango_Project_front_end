<script setup>
defineProps({
    transactions: { type: Array, default: () => [] }
})

const formatCurrency = (val) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);
};
</script>

<template>
    <div
        class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden h-full">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h3 class="font-bold text-gray-700 dark:text-gray-200">最近活动</h3>
            <button class="text-sm text-primary-600 dark:text-primary-300 hover:underline cursor-pointer">查看全部</button>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead class="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                    <tr>
                        <th class="px-6 py-3 font-medium">交易方</th>
                        <th class="px-6 py-3 font-medium">分类</th>
                        <th class="px-6 py-3 font-medium">日期</th>
                        <th class="px-6 py-3 font-medium text-right">金额</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                    <tr v-for="item in transactions" :key="item.id"
                        class="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                        <td class="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">{{ item.title }}</td>
                        <td class="px-6 py-4">
                            <span class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{{ item.category
                            }}</span>
                        </td>
                        <td class="px-6 py-4">{{ item.date }}</td>
                        <td class="px-6 py-4 text-right font-bold"
                            :class="item.type === 'expense' ? 'text-gray-800 dark:text-gray-200' : 'text-green-600 dark:text-green-400'">
                            {{ item.amount > 0 ? '+' : '' }}{{ formatCurrency(item.amount) }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>