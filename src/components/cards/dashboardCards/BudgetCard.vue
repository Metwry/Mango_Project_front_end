<script setup>
defineProps({
    progress: { type: Number, default: 0 },
    remaining: { type: Number, default: 0 }
})
</script>

<template>
    <div
        class="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center items-center h-full">
        <h3 class="font-bold text-gray-700 dark:text-gray-200 mb-2 w-full text-left">本月预算</h3>

        <div class="relative w-36 h-36 my-2 flex items-center justify-center">
            <svg class="w-full h-full transform -rotate-90">
                <circle cx="72" cy="72" r="60" stroke="#f3f4f6" stroke-width="12" fill="none"></circle>
                <circle cx="72" cy="72" r="60" stroke="#4f46e5" stroke-width="12" fill="none" stroke-dasharray="377"
                    :stroke-dashoffset="377 - (377 * progress / 100)"></circle>
            </svg>
            <div class="absolute text-center">
                <span class="text-3xl font-bold text-gray-800 dark:text-gray-200">{{ progress }}%</span>
                <p class="text-xs text-gray-400">已支出</p>
            </div>
        </div>

        <p class="text-center text-sm text-gray-500 dark:text-gray-300 font-medium">
            剩余额度: <span class="text-primary-600 dark:text-primary-300">¥{{ remaining }}</span>
        </p>
    </div>
</template>