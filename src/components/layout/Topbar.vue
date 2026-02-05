<script setup>
import BaseIcon from '../ui/BaseIcon.vue';
import UserMenu from './UserMenu.vue';

defineProps({
    title: { type: String, },
    icon: { type: String, },
})

</script>

<template>


    <header
        class="relative z-30 h-15 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 transition-colors duration-300">

        <div class="flex items-center gap-3">
            <BaseIcon v-if="icon" :name="icon" class="w-6 h-6 text-gray-800 dark:text-white" />
            <h1 class="text-xl font-bold text-gray-800 dark:text-white font-serif">
                {{ title }}
            </h1>
        </div>

        <div class="flex items-center gap-4">
            <slot name="actions"></slot>
            <UserMenu />
        </div>
    </header>
</template>
