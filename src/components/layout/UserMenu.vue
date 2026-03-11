<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { onClickOutside } from '@vueuse/core'
import BaseIcon from '../ui/BaseIcon.vue'
import SettingsModal from '../windows/SettingsModal.vue'
import UserProfileModal from '../windows/UserProfileModal.vue'
import { ElMessage } from "@/utils/element";

const router = useRouter()
const authStore = useAuthStore()
const showUserMenu = ref(false)
const userMenuRef = ref(null)
const isOpenSetting = ref(false)
const isOpenUserProfile = ref(false)
const displayName = computed(() => String(authStore.user?.username ?? "User").trim() || "User")
// 逻辑：退出登录
const handleLogout = async () => {
    await authStore.logout()
    router.replace('/login')
}
// 逻辑：触发设置并关闭菜单
const triggerSettings = () => {
    isOpenSetting.value = true

    showUserMenu.value = false
}

const triggerUserProfile = () => {
    isOpenUserProfile.value = true
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
    <UserProfileModal :is-open="isOpenUserProfile" @close="isOpenUserProfile = false" />


    <div class="relative flex items-center h-full" ref="userMenuRef">

        <Transition name="dropdown-drawer">
            <div v-if="showUserMenu"
                class="dropdown-panel absolute top-full right-0 mt-2 w-56 py-2 transform transition-all origin-top-right">
                <button @click="triggerUserProfile" class="dropdown-menu-item">
                    <BaseIcon name="settings" class="w-4 h-4" />
                    用户设置
                </button>

                <button @click="triggerSettings" class="dropdown-menu-item">
                    <BaseIcon name="settings" class="w-4 h-4" />
                    系统设置
                </button>

                <button @click="todo()" class="dropdown-menu-item">
                    <BaseIcon name="export" class="w-4 h-4" />
                    导出数据
                </button>

                <div class="dropdown-divider h-px bg-gray-100 my-1"></div>

                <button @click="handleLogout" class="dropdown-menu-item dropdown-menu-item-danger">
                    <BaseIcon name="logout" class="w-4 h-4" />
                    退出登录
                </button>
            </div>
        </Transition>

        <div @click="showUserMenu = !showUserMenu"
            class="user-menu-trigger flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-colors select-none">



            <div class="hidden sm:block">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ displayName }}</p>
            </div>

            <svg class="w-4 h-4 text-gray-400 transition-transform duration-200"
                :class="showUserMenu ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
        </div>
    </div>
</template>
