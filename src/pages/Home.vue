<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '@/components/layout/Sidebar.vue'
import TopBar from '@/components/layout/Topbar.vue'

const route = useRoute()

const currentTitle = computed(() => {
    return route.meta.title || ''
})
const icon = computed(() => {
    return route.meta.icon || ''
})

const menuItems = [
    { name: '仪表盘', path: '/dashboard', icon: 'dashboard' },
    { name: '记账', path: '/bookkeeping', icon: 'bookkeeping' },
    { name: '持仓', path: '/holdings', icon: 'holdings' },
    { name: '行情', path: '/market', icon: 'market' },
]

</script>

<template>
    <div class="flex h-screen bg-gray-50 dark:bg-gray-900">
        <!-- 侧边栏 -->
        <Sidebar :menu-items="menuItems" />
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