<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '@/components/layout/Sidebar.vue'
import TopBar from '@/components/layout/Topbar.vue'
import { useAccountsStore } from '@/stores/accounts'

const route = useRoute()
const pageScrollRef = ref(null)
const accountsStore = useAccountsStore()

const currentTitle = computed(() => {
    return route.meta.title || ''
})

const icon = computed(() => {
    return route.meta.icon || ''
})

const menuItems = [
    { name: '仪表盘', path: '/dashboard', icon: 'dashboard' },
    { name: '记账', path: '/bookkeeping', icon: 'bookkeeping' },
    { name: '投资', path: '/holdings', icon: 'holdings' },
    { name: '行情', path: '/market', icon: 'market' },
    { name: '数据分析', path: '/analysis', icon: 'market' },
]

watch(
    () => route.fullPath,
    () => {
        if (pageScrollRef.value) {
            pageScrollRef.value.scrollTop = 0
        }
    },
    { flush: 'post' }
)

onMounted(() => {
    accountsStore.startAccountsAutoRefresh()
    void accountsStore.fetchAccounts()
})

onUnmounted(() => {
    accountsStore.stopAccountsAutoRefresh()
})

</script>

<template>
    <div class="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar :menu-items="menuItems" />

        <main class="flex flex-1 flex-col overflow-hidden">
            <TopBar :title="currentTitle" :icon="icon"></TopBar>

            <div ref="pageScrollRef" class="flex-1 min-h-0 overflow-y-auto p-3">
                <RouterView v-slot="{ Component }">
                    <component :is="Component" class="h-full min-h-0" />
                </RouterView>
            </div>
        </main>
    </div>
</template>
