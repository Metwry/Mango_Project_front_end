<script setup>
import { ref, computed, watch } from "vue";
import BaseIcon from "./BaseIcon.vue";
import { onClickOutside } from "@vueuse/core";
// 1. 引入 Floating UI
import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/vue";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

const props = defineProps({ modelValue: { type: String, default: "" } });
const emit = defineEmits(["update:modelValue"]);

const open = ref(false);
const yearOpen = ref(false);
const monthOpen = ref(false);
const yearWrapRef = ref(null);
const monthWrapRef = ref(null);

// ===== Floating UI 配置 =====
const referenceRef = ref(null); // 触发按钮
const floatingRef = ref(null);  // 弹窗面板

const { floatingStyles } = useFloating(referenceRef, floatingRef, {
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [
        offset(8), // 垂直间距
        flip(),    // 空间不足自动翻转
        shift(),   // 防止溢出屏幕
        // 注意：日期选择器通常不需要 size 中间件，保持自身宽度即可
    ],
});

const CURRENT_YEAR = dayjs().year();
const YEAR_MAX = CURRENT_YEAR;
const YEAR_MIN = CURRENT_YEAR - 20;
const clampYear = (y) => Math.min(YEAR_MAX, Math.max(YEAR_MIN, (Number(y) | 0) || YEAR_MIN));

const FULL = "YYYY-MM-DD HH:mm:ss.SSS Z";
const YMD = "YYYY-MM-DD";
const now = () => dayjs();
const today = computed(() => now());
const todayStr = computed(() => today.value.format(YMD));

const parse = (s) => {
    if (!s) return null;
    const d = dayjs(s, FULL, true);
    if (d.isValid()) return d;
    const d2 = dayjs(s.replace(" ", "T"));
    return d2.isValid() ? d2 : null;
};

const init = parse(props.modelValue) || today.value;
const viewYear = ref(init.year());
const viewMonth = ref(init.month());

watch(
    () => props.modelValue,
    (v) => {
        const d = parse(v);
        if (d) (viewYear.value = d.year()), (viewMonth.value = d.month());
    }
);

const monthOptions = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
    .map((label, value) => ({ label, value }));
const yearOptions = computed(() => {
    return Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MAX - i);
});
const selectedYearLabel = computed(() => `${clampYear(viewYear.value)}年`);
const selectedMonthLabel = computed(() => monthOptions[viewMonth.value]?.label ?? `${viewMonth.value + 1}月`);
const weekLabels = ["日", "一", "二", "三", "四", "五", "六"];

const cells = computed(() => {
    const y = clampYear(viewYear.value), m = viewMonth.value;
    const first = dayjs(new Date(y, m, 1)).day();
    const dim = dayjs(new Date(y, m, 1)).daysInMonth();
    return Array.from({ length: 42 }, (_, i) => {
        const day = i - first + 1;
        return day < 1 || day > dim ? null : new Date(y, m, day);
    });
});

const selectedStr = computed(() => parse(props.modelValue)?.format(YMD) ?? "");
const isSelected = (d) => {
    const v = parse(props.modelValue);
    return !!(d && v) && dayjs(d).isSame(v, "day");
};
const isToday = (d) => !!d && dayjs(d).format(YMD) === todayStr.value;
const isFuture = (d) => !!d && dayjs(d).isAfter(today.value, "day");

const closeSubDropdowns = () => {
    yearOpen.value = false;
    monthOpen.value = false;
};
const close = () => {
    open.value = false;
    closeSubDropdowns();
};
const toggleOpen = () => {
    if (open.value) {
        close();
        return;
    }
    open.value = true;
};

// 点击外部关闭 (目标改为 floatingRef 和 referenceRef)
onClickOutside(floatingRef, () => close(), { ignore: [referenceRef] });
onClickOutside(yearWrapRef, () => (yearOpen.value = false));
onClickOutside(monthWrapRef, () => (monthOpen.value = false));

const selectDay = (cellDate) => {
    if (!cellDate || isFuture(cellDate)) return;
    const t = now();
    const picked = dayjs(cellDate)
        .hour(t.hour()).minute(t.minute()).second(t.second()).millisecond(t.millisecond());
    emit("update:modelValue", picked.format(FULL));
    close();
};

const shiftMonth = (delta) => {
    const d = dayjs(new Date(clampYear(viewYear.value), viewMonth.value, 1)).add(delta, "month");
    viewYear.value = clampYear(d.year());
    viewMonth.value = d.month();
};

const toggleYearDropdown = () => {
    yearOpen.value = !yearOpen.value;
    if (yearOpen.value) monthOpen.value = false;
};

const toggleMonthDropdown = () => {
    monthOpen.value = !monthOpen.value;
    if (monthOpen.value) yearOpen.value = false;
};

const pickYear = (year) => {
    viewYear.value = clampYear(year);
    yearOpen.value = false;
};

const pickMonth = (month) => {
    viewMonth.value = Number(month);
    monthOpen.value = false;
};

const prevMonth = () => shiftMonth(-1);
const nextMonth = () => shiftMonth(1);
</script>

<template>
    <div class="relative">
        <button ref="referenceRef" type="button" class="w-full button-base active:scale-99" @click="toggleOpen">
            <span class="truncate">
                <span v-if="selectedStr">{{ selectedStr }}</span>
                <span v-else class="text-gray-400 dark:text-gray-500">选择日期</span>
            </span>
            <BaseIcon name="date" solid class="w-4 h-4" />
        </button>

        <teleport to="body">
            <div v-if="open" ref="floatingRef" :style="floatingStyles"
                class="date-picker-panel z-50 w-[280px] sm:w-[320px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden flex flex-col">

                <div
                    class="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-1">
                    <button class="button-base" @click="prevMonth">
                        <BaseIcon name="leftArrow" class="w-4 h-4" />
                    </button>

                    <div class="flex gap-2 flex-1">
                        <div ref="yearWrapRef" class="relative flex-1 min-w-[92px]">
                            <button type="button" class="dropdown-trigger !h-9 !rounded-xl !px-2.5 !py-1.5"
                                @click="toggleYearDropdown">
                                <span class="truncate text-sm">{{ selectedYearLabel }}</span>
                                <BaseIcon name="arrow" :size="14"
                                    :class="['dropdown-arrow', yearOpen && 'rotate-180']" />
                            </button>

                            <Transition name="dropdown-drawer">
                                <div v-if="yearOpen" class="dropdown-panel absolute left-0 top-[calc(100%+6px)] w-full">
                                    <div class="dropdown-list !max-h-44">
                                        <button v-for="year in yearOptions" :key="year" type="button" class="dropdown-item"
                                            :class="clampYear(viewYear) === year ? 'dropdown-item-active' : 'dropdown-item-idle'"
                                            @click="pickYear(year)">
                                            {{ year }}年
                                        </button>
                                    </div>
                                </div>
                            </Transition>
                        </div>

                        <div ref="monthWrapRef" class="relative flex-1 min-w-[84px]">
                            <button type="button" class="dropdown-trigger !h-9 !rounded-xl !px-2.5 !py-1.5"
                                @click="toggleMonthDropdown">
                                <span class="truncate text-sm">{{ selectedMonthLabel }}</span>
                                <BaseIcon name="arrow" :size="14"
                                    :class="['dropdown-arrow', monthOpen && 'rotate-180']" />
                            </button>

                            <Transition name="dropdown-drawer">
                                <div v-if="monthOpen" class="dropdown-panel absolute left-0 top-[calc(100%+6px)] w-full">
                                    <div class="dropdown-list !max-h-44">
                                        <button v-for="m in monthOptions" :key="m.value" type="button" class="dropdown-item"
                                            :class="viewMonth === m.value ? 'dropdown-item-active' : 'dropdown-item-idle'"
                                            @click="pickMonth(m.value)">
                                            {{ m.label }}
                                        </button>
                                    </div>
                                </div>
                            </Transition>
                        </div>
                    </div>

                    <button class="button-base" @click="nextMonth">
                        <BaseIcon name="rightArrow" class="w-4 h-4" />
                    </button>
                </div>

                <div class="p-3">
                    <div class="grid grid-cols-7 gap-1 mb-1 text-xs text-gray-500 dark:text-gray-400">
                        <div v-for="w in weekLabels" :key="w" class="h-8 flex items-center justify-center font-medium">
                            {{ w }}
                        </div>
                    </div>

                    <div class="grid grid-cols-7 gap-1">
                        <button v-for="(d, idx) in cells" :key="idx" type="button" :disabled="!d || isFuture(d)" :class="[
                            d ? 'button-base' : 'pointer-events-none opacity-0',
                            // 移除固定的 w-9，改为 w-full 让 grid 控制宽度，同时使用 aspect-square 保持正方形
                            'w-full aspect-square p-0 flex items-center justify-center rounded-lg border text-sm',

                            d && isFuture(d)
                                ? 'opacity-40 cursor-not-allowed border-transparent bg-transparent shadow-none'
                                : isSelected(d)
                                    ? 'bg-gray-200 border-gray-300 text-gray-900 dark:bg-[#2c3138] dark:border-[#343a42] dark:text-white'
                                    : isToday(d)
                                        ? 'border-gray-300 bg-transparent text-gray-900 dark:border-[#343a42] dark:text-white font-semibold'
                                        : 'border-transparent bg-transparent shadow-none hover:bg-gray-100 dark:hover:bg-[#20242a]'
                        ]" @click="selectDay(d)">
                            {{ d ? d.getDate() : "" }}
                        </button>
                    </div>
                </div>
            </div>
        </teleport>
    </div>
</template>
