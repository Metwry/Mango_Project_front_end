<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BaseIcon from '../BaseIcon.vue'

// 定义 emits，用于通知父组件打开设置弹窗
const emit = defineEmits(['open-settings'])

const router = useRouter()
const authStore = useAuthStore()

const showUserMenu = ref(false)
const userMenuRef = ref(null)

// 逻辑：点击外部关闭
const handleClickOutside = (event) => {
    if (userMenuRef.value && !userMenuRef.value.contains(event.target)) {
        showUserMenu.value = false
    }
}

// 逻辑：退出登录
const handleLogout = () => {
    authStore.logout()
    router.replace('/login')
}

// 逻辑：触发父组件的设置弹窗
const triggerSettings = () => {
    emit('open-settings')
    showUserMenu.value = false
}

// 生命周期
onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
    <div class="p-4 border-t border-gray-100 dark:border-gray-700 relative" ref="userMenuRef">
        <div v-if="showUserMenu"
            class="absolute bottom-full left-4 mb-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 transform transition-all origin-bottom-left z-50">

            <button @click="triggerSettings"
                class="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary-600 transition-colors text-left cursor-pointer">
                <BaseIcon name="settings" class="w-4 h-4" />
                系统设置
            </button>

            <a href="#"
                class="flex items-center gap-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary-600 transition-colors">
                <BaseIcon name="export" class="w-4 h-4" />
                导出数据
            </a>
            <div class="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

            <button @click="handleLogout"
                class="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left cursor-pointer">
                <BaseIcon name="logout" class="w-4 h-4" />
                退出登录
            </button>
        </div>

        <div @click.stop="showUserMenu = !showUserMenu"
            class="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-xl transition-colors select-none">
            <div
                class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold border border-primary-200 dark:border-primary-800">
                User
            </div>
            <div class="flex-1">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200">我的账户</p>
            </div>
            <svg class="w-4 h-4 text-gray-400 transition-transform duration-200"
                :class="showUserMenu ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
            </svg>
        </div>
    </div>
</template>