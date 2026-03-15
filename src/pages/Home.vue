<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '@/components/layout/Sidebar.vue'
import TopBar from '@/components/layout/Topbar.vue'
import { useAccountsStore } from '@/stores/accounts'
import { useInvestmentStore } from '@/stores/investment'
import { useMarketStore } from '@/stores/market'
import { AUTO_REFRESH_ENABLED } from '@/config/Config'
import { normalizeRoutePath } from '@/utils/router'

const route = useRoute()
const pageScrollRef = ref(null)
const accountsStore = useAccountsStore()
const investmentStore = useInvestmentStore()
const marketStore = useMarketStore()

// 根据当前路由计算顶部栏标题。
const currentTitle = computed(() => {
    return route.meta.title || ''
})

// 根据当前路由计算顶部栏图标。
const icon = computed(() => {
    return route.meta.icon || ''
})

// 根据页面类型返回对应的布局样式类名。
const pageLayoutClass = computed(() => {
    return normalizeRoutePath(route.path) === '/dashboard'
        ? 'min-h-full xl:h-full xl:min-h-0'
        : 'min-h-full md:h-full md:min-h-0'
})

const menuItems = [
    { name: '仪表盘', path: '/dashboard', icon: 'dashboard' },
    { name: '记账', path: '/bookkeeping', icon: 'bookkeeping' },
    { name: '行情', path: '/market', icon: 'market' },
    { name: '投资', path: '/investment', icon: 'holdings' },
    { name: '资讯', path: '/news', icon: 'news' },
    { name: '数据分析', path: '/analysis', icon: 'analysis' },
    { name: '工具箱', path: '/tools', icon: 'toolbox' },
]

const pageTransitionName = ref('page-slide-up')

const navOrderMap = menuItems.reduce((acc, item, index) => {
    acc[item.path] = index
    return acc
}, {})

// 获取路由在导航列表中的顺序索引。
const getNavIndex = (path) => {
    return navOrderMap[normalizeRoutePath(path)] ?? -1
}

// 页面切换动画完成后重置滚动位置。
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
    if (AUTO_REFRESH_ENABLED) {
        accountsStore.startAccountsAutoRefresh()
        investmentStore.startInvestmentAutoRefresh()
        marketStore.startMarketAutoRefresh()
    }
    void accountsStore.fetchAccounts()
    void investmentStore.fetchPositions({ silent: true })
    void marketStore.fetchMarkets({ silent: true })
})

onUnmounted(() => {
    accountsStore.stopAccountsAutoRefresh()
    investmentStore.stopInvestmentAutoRefresh()
    marketStore.stopMarketAutoRefresh()
})

</script>

<template>
    <div class="app-shell flex">
        <Sidebar :menu-items="menuItems" />

        <main class="flex flex-1 min-w-0 flex-col overflow-hidden">
            <TopBar :title="currentTitle" :icon="icon" :menu-items="menuItems"></TopBar>

            <div ref="pageScrollRef" class="page-scroll flex-1 min-h-0 min-w-0 overflow-y-auto">
                <div :class="['page-transition-stage', pageLayoutClass]">
                    <RouterView v-slot="{ Component, route: currentRoute }">
                        <Transition :name="pageTransitionName" @after-enter="handlePageAfterEnter">
                            <div :key="currentRoute.fullPath" :class="['page-panel', pageLayoutClass]">
                                <component :is="Component" />
                            </div>
                        </Transition>
                    </RouterView>
                </div>
            </div>
        </main>
    </div>
</template>

<style scoped>
.app-shell {
    height: 100vh;
    height: 100dvh;
    background-color: var(--app-bg);
}

.page-transition-stage {
    position: relative;
    width: 100%;
    min-width: 0;
    overflow: hidden;
    isolation: isolate;
    contain: paint;
}

.page-panel {
    position: relative;
    z-index: 1;
    width: 100%;
    min-width: 0;
    background-color: var(--page-panel-bg);
    backface-visibility: hidden;
    transform: translateZ(0);
}

.page-scroll {
    scrollbar-gutter: stable;
    overscroll-behavior: contain;
    padding: 0.75rem;
    padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
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

@media (max-width: 767px) {

    .page-slide-up-enter-active,
    .page-slide-up-leave-active,
    .page-slide-down-enter-active,
    .page-slide-down-leave-active {
        transition: opacity 0.22s ease;
    }

    .page-slide-up-enter-from,
    .page-slide-up-leave-to,
    .page-slide-down-enter-from,
    .page-slide-down-leave-to {
        opacity: 0;
        transform: translate3d(0, 0, 0);
    }
}
</style>
