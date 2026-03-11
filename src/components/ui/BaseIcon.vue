<script setup>
import { computed } from "vue";
import { iconPaths } from "../../assets/iconPaths";

const props = defineProps({
    name: { type: String, required: true },
    solid: { type: Boolean, default: false },

    // 可选：让 spinner 能开关旋转
    spin: { type: Boolean, default: false },

    // 可选：统一控制尺寸（默认继承父级 class 也行）
    size: { type: [Number, String], default: 20 },

    // spinner 底圈透明度（0-1）
    dimOpacity: { type: Number, default: 0.25 },

});

const isSpinner = computed(() => props.name === "spinner");

const currentPath = computed(() => {
    if (isSpinner.value) return "";
    const path = iconPaths[props.name];
    if (!path) {
        console.warn(`[BaseIcon] Icon name "${props.name}" not found in iconPaths.`);
        return "";
    }
    return path;
});

const viewBox = computed(() => (props.solid ? "0 0 20 20" : "0 0 24 24"));
const spinnerDimOpacity = computed(() => {
    const value = Number(props.dimOpacity);
    if (!Number.isFinite(value)) return 0.25;
    return Math.min(1, Math.max(0, value));
});
</script>

<template>
    <svg xmlns="http://www.w3.org/2000/svg" :viewBox="isSpinner ? '0 0 24 24' : viewBox"
        :fill="isSpinner ? 'none' : (solid ? 'currentColor' : 'none')"
        :stroke="isSpinner ? 'currentColor' : (solid ? 'none' : 'currentColor')" :class="[spin && 'animate-spin']"
        :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true">
        <!-- spinner -->
        <template v-if="isSpinner">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" :style="{ opacity: spinnerDimOpacity }" />
            <path class="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </template>

        <!-- normal icons -->
        <template v-else>
            <path v-for="(p, index) in (Array.isArray(currentPath) ? currentPath : [currentPath])" :key="index" :d="p"
                :stroke-linecap="solid ? undefined : 'round'" :stroke-linejoin="solid ? undefined : 'round'"
                :stroke-width="solid ? undefined : '2'" :fill-rule="solid ? 'evenodd' : undefined"
                :clip-rule="solid ? 'evenodd' : undefined" />
        </template>
    </svg>
</template>
