<script setup>
import { ref, computed } from "vue";
import { onClickOutside } from "@vueuse/core";
import { useFloating, offset, flip, shift, size, autoUpdate } from "@floating-ui/vue";
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

// ===== 替换部分开始：引入 Floating UI =====
const referenceRef = ref(null); // 对应原来的 triggerRef
const floatingRef = ref(null);  // 对应原来的 panelRef

const { floatingStyles } = useFloating(referenceRef, floatingRef, {
    placement: "bottom-start",
    whileElementsMounted: autoUpdate, // 自动处理滚动、Resize、防抖动
    middleware: [
        offset(8), // 间距 8px
        flip(),    // 自动翻转
        shift(),   // 防止溢出
        size({     // 宽度同步
            apply({ rects, elements }) {
                Object.assign(elements.floating.style, {
                    width: `${rects.reference.width}px`,
                });
            },
        }),
    ],
});
// ===== 替换部分结束 =====

// 2. 数据逻辑：保持清晰 (完全未动)
const selectedAccount = computed(() => props.accounts.find((a) => a.id === modelValue.value));
const filteredAccounts = computed(() => {
    const q = query.value.trim().toLowerCase();
    return !q ? props.accounts : props.accounts.filter((a) => (a.name || "").toLowerCase().includes(q));
});

// 3. 交互逻辑：点击外部关闭
// 注意：这里把 ignore 的目标改为了新的 referenceRef
onClickOutside(floatingRef, () => (open.value = false), { ignore: [referenceRef] });

const toggleOpen = () => {
    open.value = !open.value;
    // 不需要 nextTick 和手动计算了
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
            <button ref="referenceRef" type="button" @click="toggleOpen"
                class="flex w-full cursor-pointer items-center justify-between button-base ">
                <span class="truncate">
                    {{ selectedAccount?.name ?? placeholder }}
                </span>
                <BaseIcon name="arrow" class="h-5 w-4" />
            </button>

            <teleport to="body">
                <div v-if="open" ref="floatingRef" :style="floatingStyles"
                    class="z-50 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">

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