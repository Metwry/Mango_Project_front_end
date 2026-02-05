<script setup>
import { ref, computed, nextTick } from "vue";
import { onClickOutside, useEventListener } from "@vueuse/core";
import BaseIcon from "./BaseIcon.vue";

// 1. 核心简化：直接双向绑定 (Vue 3.4+)
const modelValue = defineModel({ type: [Number, String, null] });

const props = defineProps({
    accounts: { type: Array, default: () => [] },
    loading: Boolean,
    error: [Boolean, Object, String],
    placeholder: { type: String, default: "全部账户" },
    searchPlaceholder: { type: String, default: "搜索账户名称..." },
});

const open = ref(false);
const query = ref("");
const triggerRef = ref(null);
const panelRef = ref(null);
const panelStyle = ref({});


// 2. 数据逻辑：保持清晰
const selectedAccount = computed(() => props.accounts.find((a) => a.id === modelValue.value));
const filteredAccounts = computed(() => {
    const q = query.value.trim().toLowerCase();
    return !q ? props.accounts : props.accounts.filter((a) => (a.name || "").toLowerCase().includes(q));
});

// 3. 交互逻辑：使用 VueUse 移除大量样板代码
// 点击面板外部自动关闭，忽略触发按钮
onClickOutside(panelRef, () => (open.value = false), { ignore: [triggerRef] });

// 计算定位 (保留核心逻辑，但更紧凑)
const updatePosition = () => {
    if (!open.value || !triggerRef.value) return;
    const rect = triggerRef.value.getBoundingClientRect();
    const gap = 8;
    const heightGuess = 260;

    // 简单判断：如果下方空间不够且上方空间够，就向上翻
    const showTop = (window.innerHeight - rect.bottom < heightGuess) && (rect.top > heightGuess);

    panelStyle.value = {
        position: "fixed",
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        zIndex: 80,
        top: showTop ? `${rect.top - gap - heightGuess}px` : `${rect.bottom + gap}px`,
    };
};

// 自动绑定与销毁事件监听
useEventListener(window, "resize", updatePosition);
useEventListener(window, "scroll", updatePosition, true);

const toggleOpen = async () => {
    open.value = !open.value;
    if (open.value) {
        await nextTick();
        updatePosition();
    }
};

const pick = (id) => {
    modelValue.value = id;
    query.value = "";
    open.value = false;
};
</script>

<template>
    <div class="relative">
        <div v-if="loading">正在加载账户...</div>
        <div v-else-if="error" class=" text-red-600">账户加载失败</div>

        <div v-else>
            <button ref="triggerRef" type="button" @click="toggleOpen"
                class="flex w-full cursor-pointer items-center justify-between button-base ">
                <span class="truncate">
                    {{ selectedAccount?.name ?? placeholder }}
                </span>
                <BaseIcon name="arrow" class="h-5 w-4" />
            </button>

            <teleport to="body">
                <div v-if="open" ref="panelRef" :style="panelStyle"
                    class="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">

                    <div class="shrink-0 border-b border-gray-100 p-2 dark:border-gray-700">
                        <input v-model="query" type="text" :placeholder="searchPlaceholder" class="input-base" />
                    </div>

                    <div class="max-h-56 overflow-y-auto p-1 space-y-1">
                        <template v-for="item in [null, ...filteredAccounts]" :key="item?.id ?? 'all'">
                            <button type="button" @click="pick(item?.id ?? '')"
                                class="button-base border-0 w-full text-left truncate group">

                                <template v-if="item">
                                    <span class="text-gray-900 dark:text-gray-100">
                                        {{ item.name }}
                                    </span>
                                </template>

                                <template v-else>
                                    <span class="text-gray-500 dark:text-gray-400">
                                        {{ placeholder }}
                                    </span>
                                </template>

                            </button>
                        </template>

                        <div v-if="filteredAccounts.length === 0 && query"
                            class="px-3 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
                            没有匹配的账户
                        </div>
                    </div>
                </div>
            </teleport>
        </div>
    </div>
</template>