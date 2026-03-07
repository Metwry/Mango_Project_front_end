<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { onClickOutside } from '@vueuse/core';
import BaseIcon from '../ui/BaseIcon.vue';
import UserMenu from './UserMenu.vue';

const props = defineProps({
    title: { type: String, },
    icon: { type: String, },
    menuItems: { type: Array, default: () => [] },
});

const route = useRoute();
const router = useRouter();
const mobileNavRef = ref(null);
const showMobileNavMenu = ref(false);

function normalizePath(path = '') {
    return String(path).replace(/\/+$/, '') || '/';
}

const currentMenuItem = computed(() => {
    const currentPath = normalizePath(route.path);
    return props.menuItems.find((item) => normalizePath(item?.path) === currentPath) || null;
});

const mobileTitle = computed(() => currentMenuItem.value?.name || props.title || '');
const mobileIcon = computed(() => currentMenuItem.value?.icon || props.icon || '');

function navigateTo(path) {
    const targetPath = normalizePath(path);
    if (!targetPath) return;
    showMobileNavMenu.value = false;
    if (targetPath === normalizePath(route.path)) return;
    router.push(targetPath);
}

onClickOutside(mobileNavRef, () => {
    showMobileNavMenu.value = false;
});

watch(
    () => route.path,
    () => {
        showMobileNavMenu.value = false;
    },
);

</script>

<template>
    <header
        class="topbar-shell relative z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 sm:px-6 transition-colors duration-300">

        <div class="flex items-center gap-3 min-w-0">
            <div ref="mobileNavRef" class="relative md:hidden">
                <button type="button"
                    class="inline-flex items-center gap-2 rounded-xl px-1 py-1 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    @click="showMobileNavMenu = !showMobileNavMenu">
                    <BaseIcon v-if="mobileIcon" :name="mobileIcon" class="w-6 h-6 text-gray-800 dark:text-white" />
                    <span class="text-xl font-bold text-gray-800 dark:text-white font-serif truncate max-w-[9rem]">
                        {{ mobileTitle }}
                    </span>
                    <BaseIcon name="arrow" class="w-4 h-4 text-gray-500 dark:text-gray-300 transition-transform duration-200"
                        :class="showMobileNavMenu ? 'rotate-180' : ''" />
                </button>

                <Transition name="mobile-nav-dropdown">
                    <div v-if="showMobileNavMenu"
                        class="absolute left-0 top-full mt-2 w-44 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                        <button v-for="item in menuItems" :key="item.path" type="button"
                            class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                            :class="normalizePath(item.path) === normalizePath(route.path)
                                ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                                : ''"
                            @click="navigateTo(item.path)">
                            <BaseIcon :name="item.icon" class="w-4 h-4" />
                            <span class="truncate">{{ item.name }}</span>
                        </button>
                    </div>
                </Transition>
            </div>

            <div class="hidden md:flex md:items-center md:gap-3">
                <BaseIcon v-if="icon" :name="icon" class="w-6 h-6 text-gray-800 dark:text-white" />
                <h1 class="text-xl font-bold text-gray-800 dark:text-white font-serif">
                    {{ title }}
                </h1>
            </div>
        </div>

        <div class="flex items-center gap-2 sm:gap-4">
            <UserMenu />
        </div>
    </header>
</template>

<style scoped>
.topbar-shell {
    min-height: calc(3.75rem + env(safe-area-inset-top));
    padding-top: env(safe-area-inset-top);
}

.mobile-nav-dropdown-enter-active,
.mobile-nav-dropdown-leave-active {
    transition: opacity 0.16s ease, transform 0.16s ease;
}

.mobile-nav-dropdown-enter-from,
.mobile-nav-dropdown-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}

@media (min-width: 768px) {
    .topbar-shell {
        min-height: 3.75rem;
        padding-top: 0;
    }
}
</style>
