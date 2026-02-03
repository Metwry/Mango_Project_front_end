<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '@/components/layout/Sidebar.vue'
import TopBar from '@/components/layout/Topbar.vue'
import SettingsModal from '@/components/windows/SettingsModal.vue'


const Settings = ref(false) //设置窗口开关参数
const route = useRoute()



const currentTitle = computed(() => {
    return route.meta.title
})
const icon = computed(() => {
    return route.meta.icon
})
</script>

<template>
    <div class="flex h-screen bg-gray-50 dark:bg-gray-900">
        <!-- 侧边栏 -->
        <Sidebar />
        <!-- 系统设置弹窗 -->
        <SettingsModal :isOpen="Settings" @close="Settings = false" />

        <!-- 主内容区域 -->
        <main class="flex-1 flex flex-col overflow-hidden">
            <!-- 顶部栏 -->
            <TopBar :title="currentTitle" :icon="icon" @openSettings="Settings = true"></TopBar>
            <!-- 路由视图 -->
            <div class="flex-1 overflow-y-auto p-4 scroll-smooth">
                <RouterView />
            </div>
        </main>
    </div>
</template>