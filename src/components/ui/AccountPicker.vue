<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from "vue";
import BaseIcon from "./BaseIcon.vue";

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

const triggerRef = ref(null);
const panelRef = ref(null);

const selectedAccount = computed(() => {
    return props.accounts.find((a) => a.id === props.modelValue) ?? null;
});


function formatMoney(amount, currency) {
    const n = Number(amount);
    if (!Number.isFinite(n)) return "";

    const c = (currency || "CNY").toUpperCase();

    try {
        return new Intl.NumberFormat("zh-CN", {
            style: "currency",
            currency: c,
            currencyDisplay: "symbol", // 显示符号（￥/$/€）
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(n);
    } catch {
        // 遇到不支持的币种时兜底
        const symbol = currencySymbol(c);
        return `${symbol}${n.toFixed(2)}`;
    }
}

// 兜底符号映射（可按需扩展）
function currencySymbol(code) {
    const map = {
        CNY: "¥",
        USD: "$",
        EUR: "€",
        GBP: "£",
        JPY: "¥",
        HKD: "HK$",
        AUD: "A$",
        CAD: "C$",
    };
    return map[code] ?? "";
}
const filteredAccounts = computed(() => {
    const q = query.value.trim().toLowerCase();
    if (!q) return props.accounts;

    return props.accounts.filter((a) => {
        const s = `${a.name ?? ""} ${a.currency ?? ""} ${a.type ?? ""}`.toLowerCase();
        return s.includes(q);
    });
});

/** ===== 悬浮定位（Teleport + fixed） ===== */
const panelPos = ref({ top: 0, left: 0, width: 0 });
const panelStyle = computed(() => ({
    position: "fixed",
    top: `${panelPos.value.top}px`,
    left: `${panelPos.value.left}px`,
    width: `${panelPos.value.width}px`,
    zIndex: 80,
}));

function computePosition() {
    const el = triggerRef.value;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const gap = 8;
    const panelHeightGuess = 320;

    let top = rect.bottom + gap;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < panelHeightGuess && rect.top > panelHeightGuess) {
        top = rect.top - gap - panelHeightGuess;
    }

    panelPos.value = {
        top: Math.max(8, top),
        left: Math.max(8, rect.left),
        width: rect.width,
    };
}

async function toggleOpen() {
    open.value = !open.value;
    if (open.value) {
        await nextTick();
        computePosition();
    }
}

function close() {
    open.value = false;
}

function pick(a) {
    emit("update:modelValue", a.id);
    query.value = "";
    close();
}

function onWindowChange() {
    if (open.value) computePosition();
}

function onDocClick(e) {
    if (!open.value) return;
    const t = e.target;
    if (triggerRef.value?.contains(t)) return;
    if (panelRef.value?.contains(t)) return;
    close();
}

onMounted(() => {
    window.addEventListener("resize", onWindowChange);
    window.addEventListener("scroll", onWindowChange, true);
    document.addEventListener("mousedown", onDocClick);
});
onUnmounted(() => {
    window.removeEventListener("resize", onWindowChange);
    window.removeEventListener("scroll", onWindowChange, true);
    document.removeEventListener("mousedown", onDocClick);
});
</script>

<template>
    <div class="relative md:col-span-1">


        <div v-if="loading" class="text-sm text-gray-500">正在加载账户...</div>
        <div v-else-if="error" class="text-sm text-red-600">账户加载失败</div>

        <div v-else>
            <!-- 触发按钮 -->
            <button ref="triggerRef" type="button"
                class="cursor-pointer w-full flex items-center justify-between button-base " @click="toggleOpen">
                <span class="truncate">
                    <span v-if="selectedAccount">
                        {{ selectedAccount.name }} · {{ selectedAccount.currency }}
                        <span class="text-gray-400 dark:text-gray-500">· {{ selectedAccount.type }}</span>
                    </span>
                    <span v-else class="text-gray-400 dark:text-gray-500">{{ placeholder }}</span>
                </span>

                <BaseIcon name="arrow" class="w-4 h-4" />
            </button>

            <!-- 悬浮下拉面板 -->
            <teleport to="body">
                <div v-if="open" ref="panelRef" :style="panelStyle" class="rounded-xl border border-gray-200 dark:border-gray-700
                 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                    <!-- 搜索框 -->
                    <div class="p-2 border-b border-gray-100 dark:border-gray-700">
                        <input v-model="query" type="text" :placeholder="searchPlaceholder" class=" input-base" />
                    </div>

                    <!-- 列表 -->
                    <div class="max-h-56 overflow-y-auto">
                        <button v-for="a in filteredAccounts" :key="a.id" type="button" class="cursor-pointer w-full text-left  
                     flex items-center justify-between  border-0 button-base" @click="pick(a)">
                            <div class="min-w-0">
                                <div class="truncate text-gray-800 dark:text-gray-100">{{ a.name }}</div>
                                <div class="truncate text-xs text-gray-500 dark:text-gray-400">
                                    {{ a.cuarrency }} · {{ a.type }}
                                </div>
                            </div>

                            <div class="text-xs text-gray-500 dark:text-gray-400">
                                {{ formatMoney(a.balance, a.currency) }}
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
