<script setup>
import { ref, onMounted } from 'vue'
import BaseIcon from '../BaseIcon.vue'

// 接收父组件传来的控制显示/隐藏的属性
const props = defineProps({
    isOpen: Boolean
})

// 定义向父组件发送的事件
const emit = defineEmits(['close'])

// 当前主题状态
const theme = ref('light')

// 初始化：组件挂载时，从 localStorage 读取主题，或者跟随系统
onMounted(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        theme.value = 'dark'
        document.documentElement.classList.add('dark')
    } else {
        theme.value = 'light'
        document.documentElement.classList.remove('dark')
    }
})

// 切换主题函数
const toggleTheme = (newTheme) => {
    theme.value = newTheme
    if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
    } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
    }
}
</script>

<template>
    <div v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">

        <div
            class="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-6 transform transition-all scale-130">

            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-bold text-gray-800 dark:text-white">系统设置</h2>
                <button @click="$emit('close')"
                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer">
                    <BaseIcon name="closeIcon" class="w-6 h-6" />
                </button>
            </div>

            <div class="space-y-6">

                <div>
                    <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">外观主题</h3>
                    <div class="grid grid-cols-2 gap-4">

                        <button @click="toggleTheme('light')"
                            class="flex flex-col items-center p-4 rounded-xl border-2 transition-all cursor-pointer"
                            :class="theme === 'light' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300'">
                            <BaseIcon name="lightIcon" class="w-8 h-8 mb-2" />
                            <span class="font-medium">浅色模式</span>
                        </button>
                        <button @click="toggleTheme('dark')"
                            class="flex flex-col items-center p-4 rounded-xl border-2 transition-all cursor-pointer"
                            :class="theme === 'dark' ? 'border-primary-600 bg-primary-50/10 text-primary-400' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300'">

                            <BaseIcon name="darkIcon" class="w-8 h-8 mb-2" />
                            <span class="font-medium">深色模式</span>
                        </button>

                    </div>
                </div>

            </div>

            <div class="mt-8 flex justify-end">
                <button @click="$emit('close')"
                    class="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors cursor-pointer">
                    完成
                </button>
            </div>

        </div>
    </div>
</template>