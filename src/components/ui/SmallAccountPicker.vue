<script setup>
import { ref, computed } from "vue";
import { onClickOutside } from "@vueuse/core";
import BaseIcon from "./BaseIcon.vue";

// 1. 核心简化：直接双向绑定 (Vue 3.4+)
const modelValue = defineModel({ type: [Number, String, null] });

const props = defineProps({
    accounts: { type: Array, default: () => [] },
    loading: Boolean,
    error: [Boolean, Object, String],
    placeholder: { type: String, default: "全部账户" },
    placement: {
        type: String,
        default: "down",
        validator: (v) => ["up", "down"].includes(v),
    },
    maxListHeight: { type: [Number, String], default: 224 },
});

const open = ref(false);
const wrapRef = ref(null);

// 2. 数据逻辑：保持清晰 (完全未动)
const selectedAccount = computed(() => {
    const current = modelValue.value;
    if (current === null || current === undefined || current === "") return null;
    return props.accounts.find((a) => String(a?.id) === String(current)) ?? null;
});
const selectedAccountId = computed(() => String(modelValue.value ?? ""));
const panelPositionClass = computed(() => {
    if (props.placement === "up") {
        return "dropdown-panel-up absolute left-0 bottom-[calc(100%+8px)] w-full flex flex-col";
    }
    return "absolute left-0 top-[calc(100%+8px)] w-full flex flex-col";
});
const listMaxHeightStyle = computed(() => {
    const n = Number(props.maxListHeight);
    if (!Number.isFinite(n) || n <= 0) return {};
    return { maxHeight: `${n}px` };
});

function isSelected(id) {
    return selectedAccountId.value === String(id ?? "");
}

// 3. 交互逻辑：点击外部关闭
onClickOutside(wrapRef, () => (open.value = false));

const toggleOpen = () => {
    open.value = !open.value;
    // 不需要 nextTick 和手动计算了
};

const pick = (id) => {
    modelValue.value = id;
    open.value = false;
};
</script>

<template>
    <div ref="wrapRef" class="relative">
        <div v-if="loading">正在加载账户...</div>
        <div v-else-if="error" class=" text-red-600">账户加载失败</div>

        <div v-else>
            <button type="button" @click="toggleOpen" class="dropdown-trigger">
                <span class="min-w-0 flex-1 truncate">
                    {{ selectedAccount?.name ?? placeholder }}
                </span>
                <BaseIcon name="arrow" :class="['dropdown-arrow', open && 'rotate-180']" />
            </button>

            <Transition name="dropdown-drawer">
                <div v-if="open" data-small-account-picker-panel="true"
                    class="dropdown-panel" :class="panelPositionClass">
                    <div class="dropdown-list" :style="listMaxHeightStyle">
                        <template v-for="item in [null, ...accounts]" :key="item?.id ?? 'all'">
                            <button type="button" @click="pick(item?.id ?? '')"
                                class="dropdown-item" :class="isSelected(item?.id) ? 'dropdown-item-active' : 'dropdown-item-idle'"
                                :title="item?.name ?? placeholder">

                                <template v-if="item">
                                    <span class="block min-w-0 truncate text-gray-900 dark:text-gray-100">
                                        {{ item.name }}
                                    </span>
                                </template>

                                <template v-else>
                                    <span class="block min-w-0 truncate text-gray-500 dark:text-gray-400">
                                        {{ placeholder }}
                                    </span>
                                </template>

                            </button>
                        </template>
                    </div>
                </div>
            </Transition>
        </div>
    </div>
</template>
