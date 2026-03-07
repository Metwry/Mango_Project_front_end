<script setup>
import { ref, onMounted } from 'vue'
import BaseIcon from '../ui/BaseIcon.vue'

const props = defineProps({
    isOpen: Boolean
})

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
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm transition-opacity sm:items-center sm:p-6">

        <div
            class="modal-content settings-modal-panel flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all dark:bg-gray-800 sm:rounded-3xl">

            <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700 sm:px-6 sm:py-4">
                <h2 class="text-lg font-bold text-gray-800 dark:text-white sm:text-xl">系统设置</h2>
                <button @click="emit('close')"
                    class="cursor-pointer text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200">
                    <BaseIcon name="closeIcon" class="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
            </div>

            <div class="max-h-[calc(100dvh-10rem)] overflow-y-auto px-4 py-4 sm:max-h-[calc(100dvh-13rem)] sm:px-6 sm:py-6">
                <div class="space-y-5 sm:space-y-6">
                    <div>
                        <h3 class="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">外观主题</h3>
                        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">

                            <button @click="toggleTheme('light')"
                                class="button-base min-h-[92px] !flex-col !justify-center gap-2 border-2 p-4 text-center sm:min-h-[110px]"
                                :class="theme === 'light'
                                    ? 'border-primary-600 bg-primary-50 text-primary-700 dark:!border-[#343a42] dark:!bg-[#2c3138] dark:!text-white'
                                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300'">
                                <BaseIcon name="lightIcon" class="mb-1 h-7 w-7 sm:h-8 sm:w-8" />
                                <span class="font-medium">浅色模式</span>
                            </button>

                            <button @click="toggleTheme('dark')"
                                class="button-base min-h-[92px] !flex-col !justify-center gap-2 border-2 p-4 text-center sm:min-h-[110px]"
                                :class="theme === 'dark'
                                    ? 'border-primary-600 bg-primary-50/10 text-primary-400 dark:!border-[#343a42] dark:!bg-[#2c3138] dark:!text-white'
                                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300'">
                                <BaseIcon name="darkIcon" class="mb-1 h-7 w-7 sm:h-8 sm:w-8" />
                                <span class="font-medium">深色模式</span>
                            </button>

                        </div>
                    </div>
                </div>
            </div>

            <div class="flex justify-end border-t border-gray-100 px-4 py-3 dark:border-gray-700 sm:px-6 sm:py-4">
                <button @click="emit('close')" class="button-base px-5 sm:px-6">
                    完成
                </button>
            </div>

        </div>
    </div>
</template>
