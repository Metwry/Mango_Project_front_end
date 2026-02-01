<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '@/components/layout/Sidebar.vue'
import TopBar from '@/components/layout/Topbar.vue'
import SettingsModal from '@/components/windows/SettingsModal.vue'

// --- 状态与钩子 ---
const showSettings = ref(false)
const route = useRoute()

// --- 逻辑：动态计算标题 ---
// 这会自动监听路由变化。如果路由配置了 meta.title 就用配置的，否则默认显示 '我的资产'
const currentTitle = computed(() => {
    return route.meta.title || '我的资产'
})
const icon = computed(() => {
    return route.meta.icon || ''
})
</script>

<template>
    <div
        class="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans transition-colors duration-300">


        <!-- 侧边栏 -->
        <Sidebar @openSettings="showSettings = true" />
        <!-- 系统设置弹窗 -->
        <SettingsModal :isOpen="showSettings" @close="showSettings = false" />

        <!-- 主内容区域 -->
        <main class="flex-1 flex flex-col overflow-hidden">
            <!-- 顶部栏 -->
            <TopBar :title="currentTitle" :icon="icon"></TopBar>
            <!-- 路由视图 -->
            <div class="flex-1 overflow-y-auto p-4 scroll-smooth">
                <RouterView />
            </div>
        </main>
    </div>
</template>