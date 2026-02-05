<script setup>
import { computed } from 'vue'
import { iconPaths } from '../../assets/iconPaths'

const props = defineProps({
    name: {
        type: String,
        required: true
    },
    // 新增 solid 属性，默认为 false，保证不影响旧图标
    solid: {
        type: Boolean,
        default: false
    }
})

// 根据 name 查找对应的 path
const currentPath = computed(() => {
    const path = iconPaths[props.name]
    if (!path) {
        console.warn(`[BaseIcon] Icon name "${props.name}" not found in iconPaths.`)
        return ''
    }
    return path
})
</script>

<template>
    <svg xmlns="http://www.w3.org/2000/svg" :viewBox="solid ? '0 0 20 20' : '0 0 24 24'"
        :fill="solid ? 'currentColor' : 'none'" :stroke="solid ? 'none' : 'currentColor'" aria-hidden="true">
        <path v-for="(p, index) in (Array.isArray(currentPath) ? currentPath : [currentPath])" :key="index" :d="p"
            :stroke-linecap="solid ? undefined : 'round'" :stroke-linejoin="solid ? undefined : 'round'"
            :stroke-width="solid ? undefined : '2'" :fill-rule="solid ? 'evenodd' : undefined"
            :clip-rule="solid ? 'evenodd' : undefined" />
    </svg>
</template>