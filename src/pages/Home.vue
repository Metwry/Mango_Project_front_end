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

const pageTransitionName = ref('page-slide-up')

const navOrderMap = menuItems.reduce((acc, item, index) => {
    acc[item.path] = index
    return acc
}, {})

const normalizePath = (path = '') => {
    return path.replace(/\/+$/, '') || '/'
}

const getNavIndex = (path) => {
    return navOrderMap[normalizePath(path)] ?? -1
}

const handlePageAfterEnter = () => {
    if (!pageScrollRef.value) {
        return
    }
    pageScrollRef.value.scrollTop = 0
}

watch(
    () => route.path,
    (newPath, oldPath) => {
        const oldIndex = getNavIndex(oldPath)
        const newIndex = getNavIndex(newPath)

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
            return
        }

        pageTransitionName.value = newIndex > oldIndex ? 'page-slide-up' : 'page-slide-down'
    }
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
                <div class="page-transition-stage min-h-full xl:h-full xl:min-h-0">
                    <RouterView v-slot="{ Component, route: currentRoute }">
                        <Transition :name="pageTransitionName" @after-enter="handlePageAfterEnter">
                            <div :key="currentRoute.fullPath" class="page-panel min-h-full xl:h-full xl:min-h-0">
                                <component :is="Component" class="min-h-full xl:h-full xl:min-h-0" />
                            </div>
                        </Transition>
                    </RouterView>
                </div>
            </div>
        </main>
    </div>
</template>

<style scoped>
.page-transition-stage {
    position: relative;
    overflow: hidden;
    isolation: isolate;
    contain: paint;
}

.page-panel {
    position: relative;
    z-index: 1;
    width: 100%;
    background-color: rgb(249, 250, 251);
    backface-visibility: hidden;
    transform: translateZ(0);
}

.dark .page-panel {
    background-color: rgb(17, 24, 39);
}

.page-slide-up-enter-active,
.page-slide-up-leave-active,
.page-slide-down-enter-active,
.page-slide-down-leave-active {
    transition: transform 0.42s cubic-bezier(0.2, 0.8, 0.2, 1);
    will-change: transform;
}

.page-slide-up-enter-active,
.page-slide-down-enter-active {
    position: absolute;
    inset: 0;
    z-index: 2;
}

.page-slide-up-leave-active,
.page-slide-down-leave-active {
    position: absolute;
    inset: 0;
    width: 100%;
    z-index: 1;
    pointer-events: none;
}

.page-slide-up-enter-from {
    transform: translate3d(0, 24px, 0);
}

.page-slide-up-enter-to,
.page-slide-up-leave-from,
.page-slide-down-enter-to,
.page-slide-down-leave-from {
    transform: translate3d(0, 0, 0);
}

.page-slide-up-leave-to {
    transform: translate3d(0, -24px, 0);
}

.page-slide-down-enter-from {
    transform: translate3d(0, -24px, 0);
}

.page-slide-down-leave-to {
    transform: translate3d(0, 24px, 0);
}

@media (prefers-reduced-motion: reduce) {

    .page-slide-up-enter-active,
    .page-slide-up-leave-active,
    .page-slide-down-enter-active,
    .page-slide-down-leave-active {
        transition: none;
    }
}
</style>
