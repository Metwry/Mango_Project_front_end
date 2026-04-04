<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '@/components/layout/Sidebar.vue'
import TopBar from '@/components/layout/Topbar.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import { useAccountsStore } from '@/stores/accounts'
import { useInvestmentStore } from '@/stores/investment'
import { useMarketStore } from '@/stores/market'
import { useAiStore } from '@/stores/ai'
import { AUTO_REFRESH_ENABLED } from '@/config/Config'
import { normalizeRoutePath } from '@/utils/router'

const route = useRoute()
const pageScrollRef = ref(null)
const accountsStore = useAccountsStore()
const investmentStore = useInvestmentStore()
const marketStore = useMarketStore()
const aiStore = useAiStore()
const SIDEBAR_COLLAPSED_KEY = 'app_sidebar_collapsed'

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
    { name: '助手', path: '/ai', icon: 'ai' },
    { name: '工具箱', path: '/tools', icon: 'toolbox' },
]

const pageTransitionName = ref('page-slide-up')
const isSidebarCollapsed = ref(false)

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

const toggleSidebar = () => {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isSidebarCollapsed.value))
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
    isSidebarCollapsed.value = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'

    if (AUTO_REFRESH_ENABLED) {
        accountsStore.startAccountsAutoRefresh()
        investmentStore.startInvestmentAutoRefresh()
        marketStore.startMarketAutoRefresh()
    }
    void accountsStore.fetchAccounts()
    void investmentStore.fetchPositions({ silent: true })
    void marketStore.fetchMarkets({ silent: true })
    void aiStore.fetchSessions()
})

onUnmounted(() => {
    accountsStore.stopAccountsAutoRefresh()
    investmentStore.stopInvestmentAutoRefresh()
    marketStore.stopMarketAutoRefresh()
})

</script>

<template>
    <div class="app-shell flex">
        <div class="sidebar-shell hidden md:block" :class="{ 'sidebar-shell-collapsed': isSidebarCollapsed }">
            <Sidebar :menu-items="menuItems" :collapsed="isSidebarCollapsed" />
            <button
                type="button"
                class="sidebar-toggle"
                :class="{ 'sidebar-toggle-collapsed': isSidebarCollapsed }"
                :aria-label="isSidebarCollapsed ? '展开导航栏' : '收起导航栏'"
                @click="toggleSidebar"
            >
                <BaseIcon :name="isSidebarCollapsed ? 'rightArrow' : 'leftArrow'" :size="18" />
            </button>
        </div>

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

.sidebar-shell {
    position: relative;
    width: 15rem;
    flex: 0 0 15rem;
    transition:
        width 0.36s cubic-bezier(0.2, 0.8, 0.2, 1),
        flex-basis 0.36s cubic-bezier(0.2, 0.8, 0.2, 1);
    overflow: visible;
}

.sidebar-shell-collapsed {
    width: 0;
    flex-basis: 0;
}

.sidebar-toggle {
    position: absolute;
    top: 50%;
    right: -0.8rem;
    z-index: 30;
    display: inline-flex;
    height: 4.25rem;
    width: 1.875rem;
    align-items: center;
    justify-content: center;
    transform: translateY(-50%);
    border: 1px solid var(--border-subtle);
    border-radius: 1rem;
    background-color: var(--surface-2);
    color: var(--text-secondary);
    box-shadow:
        0 10px 26px rgba(15, 23, 42, 0.14),
        0 0 0 1px rgba(255, 255, 255, 0.02) inset;
    transition:
        background-color 0.24s ease,
        color 0.24s ease,
        border-color 0.24s ease,
        box-shadow 0.24s ease,
        transform 0.24s ease,
        right 0.36s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.sidebar-toggle-collapsed {
    right: -2.5rem;
}

.sidebar-toggle:hover {
    border-color: var(--border-strong);
    background-color: var(--surface-hover);
    color: var(--text-primary);
    box-shadow:
        0 14px 30px rgba(15, 23, 42, 0.18),
        0 0 0 1px rgba(255, 255, 255, 0.03) inset;
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

    .sidebar-shell,
    .sidebar-toggle,

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
