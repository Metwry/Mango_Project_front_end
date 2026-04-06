<script setup>
import BaseIcon from '../ui/BaseIcon.vue';
import { APP_VERSION_LABEL } from '@/config/Config';
defineProps({
    menuItems: { type: Array, default: () => [] },
    collapsed: { type: Boolean, default: false },
    onToggleCollapse: { type: Function, default: null },
})
</script>

<template>
    <aside
        class="app-sidebar flex h-full w-full flex-col border-r border-gray-200 bg-white transition-all duration-300"
    >
        <div class="app-sidebar-header h-15 flex items-center border-b border-gray-100" :class="collapsed ? 'justify-center px-0' : 'gap-2 px-8'">
            <BaseIcon name="mango" class="app-sidebar-logo h-6 w-6 shrink-0" />
            <div v-if="!collapsed" class="min-w-0">
                <p class="app-sidebar-brand text-lg font-bold font-serif leading-tight">Mango Finance</p>
                <p class="app-sidebar-version text-[10px] font-medium tracking-wide leading-tight">{{ APP_VERSION_LABEL }}</p>
            </div>
        </div>


        <nav class="flex-1 py-6 space-y-2" :class="collapsed ? 'px-2' : 'px-4'">
            <RouterLink v-for="item in menuItems" :key="item.path" :to="item.path" active-class="nav-item-active"
                class="nav-item" :class="collapsed ? '!justify-center !gap-0 !px-0' : ''" :title="collapsed ? item.name : ''">
                <BaseIcon :name="item.icon" class="w-5 h-5 shrink-0" />
                <span v-if="!collapsed" class="truncate">{{ item.name }}</span>
            </RouterLink>
        </nav>

        <div class="mt-auto space-y-2 pb-6" :class="collapsed ? 'px-2' : 'px-4'">
            <button
                type="button"
                class="sidebar-collapse-button"
                :class="collapsed ? 'justify-center px-0' : ''"
                :aria-label="collapsed ? '展开侧边栏' : '收起侧边栏'"
                :title="collapsed ? '展开侧边栏' : ''"
                @click="onToggleCollapse && onToggleCollapse()"
            >
                <BaseIcon :name="collapsed ? 'rightArrow' : 'leftArrow'" :size="18" class="shrink-0" />
                <span v-if="!collapsed" class="truncate">收起侧边栏</span>
            </button>

            <a href="https://github.com/Metwry/Mango_Project_front_end" target="_blank" rel="noopener noreferrer"
                class="nav-item text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                :class="collapsed ? '!justify-center !gap-0 !px-0' : ''"
                :title="collapsed ? 'GitHub' : ''">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"
                    aria-hidden="true">
                    <path
                        d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.012-1.23-.017-2.232-3.338.725-4.042-1.416-4.042-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.807 1.305 3.492.998.108-.775.418-1.305.762-1.605-2.665-.303-5.467-1.332-5.467-5.93 0-1.31.468-2.38 1.236-3.22-.123-.302-.535-1.522.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 016.003 0c2.29-1.552 3.297-1.23 3.297-1.23.653 1.654.24 2.874.118 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.807 5.624-5.48 5.922.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
                <span v-if="!collapsed">GitHub</span>
            </a>
        </div>
    </aside>
</template>

<style scoped>
.sidebar-collapse-button {
    display: inline-flex;
    width: 100%;
    align-items: center;
    gap: 0.625rem;
    border: 0;
    border-radius: 9999px;
    background: transparent;
    padding: 0.875rem 1rem;
    color: var(--text-secondary);
    font-size: 1rem;
    font-weight: 600;
    transition:
        background-color 0.2s ease,
        color 0.2s ease,
        transform 0.2s ease;
    cursor: pointer;
    outline: none;
}

.sidebar-collapse-button:hover {
    background-color: var(--surface-hover);
    color: var(--text-primary);
}

.sidebar-collapse-button:focus,
.sidebar-collapse-button:focus-visible {
    outline: none;
    box-shadow: none;
}

.dark .sidebar-collapse-button {
    color: var(--text-secondary);
}

.dark .sidebar-collapse-button:hover {
    background-color: var(--surface-hover);
    color: var(--text-primary);
}
</style>

