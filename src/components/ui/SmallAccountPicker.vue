<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from "vue";

const props = defineProps({
    modelValue: { type: [Number, String, null], default: null },
    accounts: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: [Boolean, Object, String, null], default: null },
    placeholder: { type: String, default: "全部账户" },
    searchPlaceholder: { type: String, default: "搜索账户名称..." },
});

const emit = defineEmits(["update:modelValue"]);

const open = ref(false);
const query = ref("");

const triggerRef = ref(null);
const panelRef = ref(null);

const selectedAccount = computed(() => {
    return props.accounts.find((a) => a.id === props.modelValue) ?? null;
});

const filteredAccounts = computed(() => {
    const q = query.value.trim().toLowerCase();
    if (!q) return props.accounts;
    return props.accounts.filter((a) => `${a.name ?? ""}`.toLowerCase().includes(q));
});

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
    const panelHeightGuess = 260;

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

function pick(value) {
    emit("update:modelValue", value);
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
    <div class="relative">

        <div v-if="loading" class="text-[11px] text-gray-500">正在加载账户...</div>
        <div v-else-if="error" class="text-[11px] text-red-600">账户加载失败</div>

        <div v-else>
            <button ref="triggerRef" type="button" class="cursor-pointer w-full flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700
               bg-white dark:bg-gray-800 px-3 py-2 text-[11px]
               text-gray-700 dark:text-gray-200
               hover:bg-gray-50 dark:hover:bg-gray-700
               focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600" @click="toggleOpen">
                <span class="truncate">
                    <span v-if="selectedAccount">{{ selectedAccount.name }}</span>
                    <span v-else class="text-gray-400 dark:text-gray-500">{{ placeholder }}</span>
                </span>

                <svg class="h-4 w-4 opacity-70 cursor-pointer" viewBox="0 0 20 20" fill="currentColor"
                    aria-hidden="true">
                    <path fill-rule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                        clip-rule="evenodd" />
                </svg>
            </button>

            <teleport to="body">
                <div v-if="open" ref="panelRef" :style="panelStyle" class="rounded-xl border border-gray-200 dark:border-gray-700
                 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                    <div class="p-2 border-b border-gray-100 dark:border-gray-700">
                        <input v-model="query" type="text" :placeholder="searchPlaceholder" class="w-full rounded-lg border border-gray-200 dark:border-gray-700
                     bg-white dark:bg-gray-800 px-3 py-2 text-[11px]
                     text-gray-700 dark:text-gray-200 outline-none
                     focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600" />
                    </div>

                    <div class="max-h-56 overflow-y-auto">


                        <button v-for="a in filteredAccounts" :key="a.id" type="button" class="cursor-pointer w-full text-left px-3 py-2 text-[11px]
                     hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200" @click="pick(a.id)">
                            <div class="truncate">{{ a.name }}</div>
                        </button>

                        <div v-if="filteredAccounts.length === 0" class="px-3 py-3 text-[11px] text-gray-500">
                            没有匹配的账户
                        </div>
                    </div>
                </div>
            </teleport>
        </div>
    </div>
</template>
