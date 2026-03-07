<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useFloating, offset, flip, shift, size, autoUpdate } from "@floating-ui/vue";
import BaseIcon from "./BaseIcon.vue";
import { formatCurrencyAmount } from "@/utils/formatters";

const props = defineProps({
    modelValue: { type: [Number, String, null], default: null },
    accounts: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: [Boolean, Object, String, null], default: null },
    placeholder: { type: String, default: "请选择账户" },
    searchPlaceholder: { type: String, default: "搜索账户名称 / 币种 / 类型..." },
});

const emit = defineEmits(["update:modelValue"]);

const open = ref(false);
const query = ref("");
const selectedAccountId = computed(() => String(props.modelValue ?? ""));

// ===== Floating UI 配置 =====
const referenceRef = ref(null); // 触发按钮
const floatingRef = ref(null);  // 下拉面板

const { floatingStyles } = useFloating(referenceRef, floatingRef, {
    placement: "bottom-start", // 默认显示在左下方
    whileElementsMounted: autoUpdate, // 自动监听滚动和Resize，解决抖动问题
    middleware: [
        offset(8), // 垂直间距 8px
        flip(),    // 空间不足时翻转
        shift(),   // 防止溢出屏幕
        size({     // 宽度同步
            apply({ rects, elements }) {
                Object.assign(elements.floating.style, {
                    width: `${rects.reference.width}px`,
                });
            },
        }),
    ],
});

/** 选中账户 */
const selectedAccount = computed(() => {
    const mv = props.modelValue;
    if (mv === null || mv === undefined) return null;
    return props.accounts.find((a) => String(a.id) === String(mv)) ?? null;
});

/** 搜索过滤 */
const filteredAccounts = computed(() => {
    const q = query.value.trim().toLowerCase();
    if (!q) return props.accounts;
    return props.accounts.filter((a) => {
        const s = `${a.name ?? ""} ${a.currency ?? ""} ${a.type ?? ""}`.toLowerCase();
        return s.includes(q);
    });
});

/** 交互逻辑 */
function toggleOpen() {
    open.value = !open.value;
}

function close() {
    open.value = false;
}

function pick(a) {
    emit("update:modelValue", a.id);
    query.value = "";
    close();
}

function isSelected(id) {
    return selectedAccountId.value === String(id ?? "");
}

/** 点击外部关闭 */
function onDocClick(e) {
    if (!open.value) return;
    const target = e.target;
    // 如果点击的是按钮本身或下拉框内部，不关闭
    if (referenceRef.value?.contains(target)) return;
    if (floatingRef.value?.contains(target)) return;
    close();
}

onMounted(() => {
    document.addEventListener("mousedown", onDocClick);
});

onUnmounted(() => {
    document.removeEventListener("mousedown", onDocClick);
});
</script>

<template>
    <div class="relative md:col-span-1">
        <div v-if="loading" class="text-sm text-gray-500">正在加载账户...</div>
        <div v-else-if="error" class="text-sm text-red-600">账户加载失败</div>

        <div v-else>
            <button ref="referenceRef" type="button" class="dropdown-trigger !h-10" @click="toggleOpen">
                <span class="min-w-0 flex-1 truncate text-left">
                    <span v-if="selectedAccount">
                        {{ selectedAccount.name }} · {{ selectedAccount.currency }}
                        <span class="text-gray-400 dark:text-gray-500">· {{ selectedAccount.type }}</span>
                    </span>
                    <span v-else class="text-gray-400 dark:text-gray-500">{{ placeholder }}</span>
                </span>

                <BaseIcon name="arrow" :size="14" :class="['dropdown-arrow', open && 'rotate-180']" />
            </button>

            <teleport to="body">
                <div v-if="open" ref="floatingRef" :style="floatingStyles"
                    class="account-picker-panel dropdown-panel z-50">

                    <div class="p-2 border-b border-gray-100 dark:border-gray-700">
                        <input v-model="query" type="text" :placeholder="searchPlaceholder" class="input-base h-10 px-3" />
                    </div>

                    <div class="dropdown-list !max-h-56 !p-0">
                        <button v-for="a in filteredAccounts" :key="a.id" type="button"
                            class="dropdown-item !w-full !rounded-none !px-3 !py-2.5 !flex !items-center !justify-between !gap-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                            :class="isSelected(a.id) ? 'dropdown-item-active' : 'dropdown-item-idle'"
                            @click="pick(a)">
                            <div class="min-w-0">
                                <div class="truncate text-gray-800 dark:text-gray-100" :title="a.name">{{ a.name }}</div>
                                <div class="truncate text-xs text-gray-500 dark:text-gray-400">
                                    {{ a.currency }} · {{ a.type }}
                                </div>
                            </div>

                            <div class="text-xs text-gray-500 dark:text-gray-400">
                                {{ formatCurrencyAmount(a.balance, a.currency, { invalidText: '' }) }}
                            </div>
                        </button>

                        <div v-if="filteredAccounts.length === 0" class="px-3 py-3 text-sm text-gray-500">
                            没有匹配的账户
                        </div>
                    </div>
                </div>
            </teleport>
        </div>
    </div>
</template>
