<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";

const props = defineProps({
    // 接收格式示例: "2026-02-02 14:40:42.622 +08:00"
    modelValue: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue"]);

const open = ref(false);
const triggerRef = ref(null);
const panelRef = ref(null);

const YEAR_MIN = 1900;
const YEAR_MAX = 2100;
const clampYear = (y) => Math.min(YEAR_MAX, Math.max(YEAR_MIN, Math.trunc(Number(y) || YEAR_MIN)));

// --- 1. 新增：格式化函数 (生成目标长字符串) ---
const formatFullTime = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    const pad3 = (n) => String(n).padStart(3, '0');

    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const min = pad(date.getMinutes());
    const s = pad(date.getSeconds());
    const ms = pad3(date.getMilliseconds());

    // 计算时区 (例如北京时间 -480 分钟 -> +08:00)
    const timezoneOffset = -date.getTimezoneOffset();
    const sign = timezoneOffset >= 0 ? '+' : '-';
    const offsetH = pad(Math.floor(Math.abs(timezoneOffset) / 60));
    const offsetM = pad(Math.abs(timezoneOffset) % 60);

    // 返回格式: YYYY-MM-DD HH:mm:ss.SSS +ZZ:zz
    return `${y}-${m}-${d} ${h}:${min}:${s}.${ms} ${sign}${offsetH}:${offsetM}`;
};

// --- 2. 新增：辅助函数 (仅提取 YYYY-MM-DD 用于 UI 显示和比对) ---
const toYMD = (date) => {
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

// --- 3. 修改：解析函数 ---
// 兼容处理：有些浏览器 new Date() 不支持中间带空格，替换为 T 变成标准 ISO
const parse = (s) => {
    if (!s) return null;
    let d = new Date(s);
    if (isNaN(d.getTime())) {
        // 尝试修复格式 (例如将 "2026-02-02 14:..." 变成 "2026-02-02T14:...")
        d = new Date(s.replace(' ', 'T'));
    }
    return isNaN(d.getTime()) ? null : d;
};

const today = new Date();
const todayStr = toYMD(today);

const init = parse(props.modelValue) || today;
const viewYear = ref(init.getFullYear());
const viewMonth = ref(init.getMonth()); // 0-11

watch(
    () => props.modelValue,
    (v) => {
        const d = parse(v);
        if (!d) return;
        viewYear.value = d.getFullYear();
        viewMonth.value = d.getMonth();
    }
);

const monthOptions = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月",
].map((label, value) => ({ label, value }));

const weekLabels = ["日", "一", "二", "三", "四", "五", "六"];

const cells = computed(() => {
    const y = clampYear(viewYear.value);
    const m = viewMonth.value;

    const first = new Date(y, m, 1).getDay();
    const dim = new Date(y, m + 1, 0).getDate();

    return Array.from({ length: 42 }, (_, i) => {
        const day = i - first + 1;
        return day < 1 || day > dim ? null : new Date(y, m, day);
    });
});

// --- 4. 修改：显示的文字 ---
// 按钮上只显示 "2026-02-02"，虽然实际值是长字符串，防止按钮太长
const selectedStr = computed(() => {
    const d = parse(props.modelValue);
    return d ? toYMD(d) : "";
});

const panelPos = ref({ top: 0, left: 0, width: 0 });

const panelStyle = computed(() => ({
    position: "fixed",
    top: `${panelPos.value.top}px`,
    left: `${panelPos.value.left}px`,
    width: `${panelPos.value.width}px`,
    zIndex: 60,
}));

const computePanelPosition = () => {
    const el = triggerRef.value;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const gap = 8;
    const guessH = 320;

    let top = rect.bottom + gap;
    if (window.innerHeight - rect.bottom < guessH && rect.top > guessH) {
        top = rect.top - gap - guessH;
    }

    panelPos.value = {
        top: Math.max(8, top),
        left: Math.max(8, rect.left),
        width: rect.width,
    };
};

const toggleOpen = async () => {
    open.value = !open.value;
    if (open.value) {
        await nextTick();
        computePanelPosition();
    }
};
const close = () => (open.value = false);

// --- 5. 核心修改：点击日期时的逻辑 ---
const selectDay = (cellDate) => {
    if (!cellDate) return;

    // 获取当前时刻 (时分秒毫秒)
    const now = new Date();

    // 创建新日期：使用选中的【年/月/日】 + 当前的【时/分/秒】
    const finalDate = new Date(
        cellDate.getFullYear(),
        cellDate.getMonth(),
        cellDate.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds()
    );

    // 格式化为完整字符串并发送
    emit("update:modelValue", formatFullTime(finalDate));
    close();
};

const prevMonth = () => {
    if (viewMonth.value === 0) {
        viewMonth.value = 11;
        viewYear.value = clampYear(viewYear.value - 1);
    } else viewMonth.value--;
};
const nextMonth = () => {
    if (viewMonth.value === 11) {
        viewMonth.value = 0;
        viewYear.value = clampYear(viewYear.value + 1);
    } else viewMonth.value++;
};

const onYearCommit = () => (viewYear.value = clampYear(viewYear.value));

const onWindowChange = () => open.value && computePanelPosition();
const onDocClick = (e) => {
    if (!open.value) return;
    const t = e.target;
    if (triggerRef.value?.contains(t)) return;
    if (panelRef.value?.contains(t)) return;
    close();
};

const ymd = toYMD;

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
        <button ref="triggerRef" type="button" class="cursor-pointer w-full flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700
             bg-white dark:bg-gray-800 px-3 py-2 text-sm
             text-gray-700 dark:text-gray-200
             hover:bg-gray-50 dark:hover:bg-gray-700
             focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600" @click="toggleOpen">
            <span class="truncate">
                <span v-if="selectedStr">{{ selectedStr }}</span>
                <span v-else class="text-gray-400 dark:text-gray-500">选择日期</span>
            </span>

            <svg class="h-4 w-4 opacity-70" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd"
                    d="M6 2a1 1 0 012 0v1h4V2a1 1 0 112 0v1h1a2 2 0 012 2v2H3V5a2 2 0 012-2h1V2zm13 7H3v7a2 2 0 002 2h12a2 2 0 002-2V9z"
                    clip-rule="evenodd" />
            </svg>
        </button>

        <teleport to="body">
            <div v-if="open" ref="panelRef" :style="panelStyle"
                class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                <!-- header -->
                <div class="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                    <button type="button" class="cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        @click="prevMonth">
                        <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd"
                                d="M12.78 15.53a.75.75 0 01-1.06 0L6.47 10.28a.75.75 0 010-1.06l5.25-5.25a.75.75 0 111.06 1.06L8.06 9.75l4.72 4.72a.75.75 0 010 1.06z"
                                clip-rule="evenodd" />
                        </svg>
                    </button>

                    <input v-model.number="viewYear" type="number" :min="YEAR_MIN" :max="YEAR_MAX" inputmode="numeric"
                        class="w-28 h-8 rounded-lg border border-gray-200 dark:border-gray-700
                   bg-white dark:bg-gray-800 px-2 text-xs
                   text-gray-700 dark:text-gray-200 outline-none
                   focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600" @blur="onYearCommit"
                        @keydown.enter.prevent="onYearCommit" />

                    <select v-model.number="viewMonth" class="cursor-pointer w-24 h-8 rounded-lg border border-gray-200 dark:border-gray-700
                   bg-white dark:bg-gray-800 px-2 text-xs
                   text-gray-700 dark:text-gray-200 outline-none
                   focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600">
                        <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
                    </select>

                    <button type="button" class="cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        @click="nextMonth">
                        <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd"
                                d="M7.22 4.47a.75.75 0 011.06 0l5.25 5.25a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 11-1.06-1.06l4.72-4.72-4.72-4.72a.75.75 0 010-1.06z"
                                clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>

                <!-- week -->
                <div class="grid grid-cols-7 px-3 pt-2 text-xs text-gray-500 dark:text-gray-400">
                    <div v-for="w in weekLabels" :key="w" class="text-center py-1">{{ w }}</div>
                </div>

                <!-- days -->
                <div class="grid grid-cols-7 gap-0.5 px-2 pb-0">
                    <button v-for="(d, idx) in cells" :key="idx" type="button"
                        class="cursor-pointer h-9 rounded-lg text-sm flex items-center justify-center" :class="[
                            !d ? 'pointer-events-none opacity-0' : 'hover:bg-gray-50 dark:hover:bg-gray-700',
                            d && ymd(d) === todayStr ? 'ring-1 ring-gray-200 dark:ring-gray-600' : '',
                            d && selectedStr && ymd(d) === selectedStr
                                ? 'bg-gray-900 text-white hover:bg-gray-900'
                                : 'text-gray-700 dark:text-gray-200'
                        ]" @click="selectDay(d)">
                        {{ d ? d.getDate() : '' }}
                    </button>
                </div>
            </div>
        </teleport>
    </div>
</template>
