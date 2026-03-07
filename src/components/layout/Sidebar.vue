<script setup>
import BaseIcon from '../ui/BaseIcon.vue';
import { APP_VERSION_LABEL } from '@/config/Config';
defineProps({
    menuItems: { type: Array, default: () => [] }
})
</script>

<template>
    <aside
        class="w-60 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col z-20 transition-colors duration-300">
        <div class="h-15 gap-2 flex items-center px-8 border-b border-gray-100 dark:border-gray-700">
            <BaseIcon name="mango" class="w-6 h-6 text-primary-600 " />
            <div class="min-w-0">
                <p class="text-lg font-bold text-primary-600 font-serif leading-tight">Mango Finance</p>
                <p class="text-[10px] font-medium tracking-wide text-primary-500/85 leading-tight">{{ APP_VERSION_LABEL }}</p>
            </div>

        </div>


        <nav class="flex-1 px-4 py-6 space-y-2">
            <RouterLink v-for="item in menuItems" :key="item.path" :to="item.path" active-class="nav-item-active"
                class="nav-item">
                <BaseIcon :name="item.icon" class="w-5 h-5" />
                {{ item.name }}
            </RouterLink>
        </nav>

        <div class="px-4 pb-6">
            <a href="https://github.com/Metwry/Mango_Project_front_end" target="_blank" rel="noopener noreferrer"
                class="nav-item text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"
                    aria-hidden="true">
                    <path
                        d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.012-1.23-.017-2.232-3.338.725-4.042-1.416-4.042-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.807 1.305 3.492.998.108-.775.418-1.305.762-1.605-2.665-.303-5.467-1.332-5.467-5.93 0-1.31.468-2.38 1.236-3.22-.123-.302-.535-1.522.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 016.003 0c2.29-1.552 3.297-1.23 3.297-1.23.653 1.654.24 2.874.118 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.807 5.624-5.48 5.922.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
                GitHub
            </a>
        </div>
    </aside>
</template>

