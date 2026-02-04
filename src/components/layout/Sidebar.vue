<script setup>
import BaseIcon from '../BaseIcon.vue';
defineProps({
    menuItems: { type: Array, default: () => [] }
})
</script>

<template>
    <aside
        class="w-60 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col z-20 transition-colors duration-300">
        <div class="h-15 gap-2 flex items-center px-8 border-b border-gray-100 dark:border-gray-700">
            <BaseIcon name="mango" class="w-6 h-6 text-primary-600 " />
            <span class="text-lg font-bold text-primary-600 font-serif">Mango Finance</span>
        </div>

        <nav class="flex-1 px-4 py-6 space-y-2">
            <RouterLink v-for="item in menuItems" :key="item.path" :to="item.path" active-class="nav-item-active"
                class="nav-item">
                <BaseIcon :name="item.icon" class="w-5 h-5" />
                {{ item.name }}
            </RouterLink>
        </nav>
    </aside>
</template>