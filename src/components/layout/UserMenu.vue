<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { onClickOutside } from '@vueuse/core'
import BaseIcon from '../ui/BaseIcon.vue'
import SettingsModal from '../windows/SettingsModal.vue'
import { ElMessage, ElMessageBox } from "element-plus";

const router = useRouter()
const authStore = useAuthStore()
const showUserMenu = ref(false)
const userMenuRef = ref(null)
const isOpenSetting = ref(false)
// 逻辑：退出登录
const handleLogout = () => {
    authStore.logout()
    router.replace('/login')
}
// 逻辑：触发设置并关闭菜单
const triggerSettings = () => {
    isOpenSetting.value = true

    showUserMenu.value = false
}
// 点击外部自动关闭
onClickOutside(userMenuRef, () => {
    showUserMenu.value = false
})

// 功能未开发放
function todo() {
    ElMessage.error("该功能未开发")
}



</script>

<template>

    <!-- 系统设置弹窗 -->
    <SettingsModal :is-Open="isOpenSetting" @close="isOpenSetting = false" />


    <div class="relative flex items-center h-full" ref="userMenuRef">

        <div v-if="showUserMenu"
            class="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 transform transition-all origin-top-right z-50">
            <button @click="triggerSettings"
                class="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary-600 transition-colors text-left cursor-pointer">
                <BaseIcon name="settings" class="w-4 h-4" />
                系统设置
            </button>

            <button @click="todo()"
                class="w-full cursor-pointer  flex items-center gap-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary-600 transition-colors">
                <BaseIcon name="export" class="w-4 h-4" />
                导出数据
            </button>

            <div class="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

            <button @click="handleLogout"
                class="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left cursor-pointer">
                <BaseIcon name="logout" class="w-4 h-4" />
                退出登录
            </button>
        </div>

        <div @click="showUserMenu = !showUserMenu"
            class="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-xl transition-colors select-none">

            <div
                class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold border border-primary-200 dark:border-primary-800 text-xs">
                User
            </div>

            <div class="hidden sm:block">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200">我的账户</p>
            </div>

            <svg class="w-4 h-4 text-gray-400 transition-transform duration-200"
                :class="showUserMenu ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
        </div>
    </div>
</template>