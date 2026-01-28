<script setup>
import { computed } from 'vue'
import { iconPaths } from '../assets/iconPaths' // 引入路径字典

const props = defineProps({
    name: {
        type: String,
        required: true
    }
})

// 根据 name 查找对应的 path
const currentPath = computed(() => {
    const path = iconPaths[props.name]
    if (!path) {
        console.warn(`[BaseIcon] Icon name "${props.name}" not found in iconPaths.`)
        return '' // 或者返回一个默认的问号图标路径
    }
    return path
})
</script>

<template>
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <!-- <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="currentPath" /> -->
        <path v-for="(p, index) in (Array.isArray(currentPath) ? currentPath : [currentPath])" :key="index" :d="p"
            stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
    </svg>
</template>