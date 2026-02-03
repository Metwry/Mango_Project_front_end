<script setup>
import BaseIcon from '../BaseIcon.vue';
import UserMenu from './UserMenu.vue'; // 引入新组件

const emit = defineEmits(['openSettings'])

const menuItems = [
    { name: '仪表盘', path: '/dashboard', icon: 'dashboard' },
    { name: '记账', path: '/bookkeeping', icon: 'bookkeeping' },
    { name: '持仓', path: '/holdings', icon: 'holdings' },
    { name: '行情', path: '/market', icon: 'market' }
]
</script>

<template>
    <aside
        class="w-60 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col z-20 transition-colors duration-300">
        <div class="h-15 gap-2 flex items-center px-8 border-b border-gray-100 dark:border-gray-700">
            <BaseIcon name="mango" class="w-6 h-6 text-primary-600 " />
            <span class="text-lg font-bold text-primary-600 font-serif">Mango Finance</span>
        </div>

        <nav class="flex-1 px-4 py-6 space-y-2">
            <RouterLink v-for="item in menuItems" :key="item.path" :to="item.path"
                active-class="bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                class="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-primary-600 dark:hover:text-primary-400 rounded-xl font-medium transition-all duration-200 transform active:scale-90">
                <BaseIcon :name="item.icon" class="w-5 h-5" />
                {{ item.name }}
            </RouterLink>
        </nav>

        <!-- <UserMenu @openSettings="emit('openSettings')" /> -->
    </aside>
</template>