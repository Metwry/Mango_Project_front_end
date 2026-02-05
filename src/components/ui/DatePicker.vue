<script setup>
import { ref, computed, watch, nextTick } from "vue";
import BaseIcon from "./BaseIcon.vue";

import { onClickOutside, useEventListener } from "@vueuse/core";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

const props = defineProps({ modelValue: { type: String, default: "" } });
const emit = defineEmits(["update:modelValue"]);

const open = ref(false);
const triggerRef = ref(null);
const panelRef = ref(null);

const YEAR_MIN = 1900, YEAR_MAX = 2100;
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
    const r = el.getBoundingClientRect(), gap = 8, guessH = 320;
    const below = !(window.innerHeight - r.bottom < guessH && r.top > guessH);
    panelPos.value = {
        top: Math.max(8, below ? r.bottom + gap : r.top - gap - guessH),
        left: Math.max(8, r.left),
        width: r.width,
    };
};

const close = () => (open.value = false);

const toggleOpen = async () => {
    open.value = !open.value;
    if (open.value) await nextTick(), computePanelPosition();
};

// 用 VueUse 替代 document/window 手写监听
onClickOutside(panelRef, (e) => {
    if (!open.value) return;
    if (triggerRef.value?.contains(e.target)) return;
    close();
});
useEventListener(window, "resize", () => open.value && computePanelPosition());
useEventListener(window, "scroll", () => open.value && computePanelPosition(), { capture: true });

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

const prevMonth = () => shiftMonth(-1);
const nextMonth = () => shiftMonth(1);
const onYearCommit = () => (viewYear.value = clampYear(viewYear.value));
</script>

<template>
    <div class="relative">
        <button ref="triggerRef" type="button" class="w-full button-base active:scale-95" @click="toggleOpen">
            <span class="truncate">
                <span v-if="selectedStr">{{ selectedStr }}</span>
                <span v-else class="text-gray-400 dark:text-gray-500">选择日期</span>
            </span>
            <BaseIcon name="date" solid class="w-4 h-4" />
        </button>

        <teleport to="body">
            <div v-if="open" ref="panelRef" :style="panelStyle"
                class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                <div class="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                    <button type="button" class="cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        @click="prevMonth">
                        <BaseIcon name="leftArrow" class="w-4 h-4" />
                    </button>

                    <input v-model.number="viewYear" type="number" :min="YEAR_MIN" :max="YEAR_MAX" inputmode="numeric"
                        class="w-28 h-8 input-base" @blur="onYearCommit" @keydown.enter.prevent="onYearCommit" />

                    <select v-model.number="viewMonth" class="cursor-pointer w-24 h-8 rounded-lg border border-gray-200 dark:border-gray-700
                   bg-white dark:bg-gray-800 px-2 text-xs
                   text-gray-700 dark:text-gray-200 outline-none
                   focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600">
                        <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
                    </select>

                    <button type="button" class="cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        @click="nextMonth">
                        <BaseIcon name="rightArrow" class="w-4 h-4" />
                    </button>
                </div>

                <div class="grid grid-cols-7 px-3 pt-2 text-xs text-gray-500 dark:text-gray-400">
                    <div v-for="w in weekLabels" :key="w" class="text-center py-1">{{ w }}</div>
                </div>

                <div class="grid grid-cols-7 gap-0.5 px-2 pb-0">
                    <button v-for="(d, idx) in cells" :key="idx" type="button" :disabled="!d || isFuture(d)" :class="[
                        d ? 'button-base' : 'pointer-events-none opacity-0',
                        'h-9 w-9 p-0 flex items-center justify-center rounded-lg border',

                        d && isFuture(d)
                            ? 'opacity-40 cursor-not-allowed border-transparent bg-transparent shadow-none'
                            : isSelected(d)
                                ? 'bg-gray-200 border-gray-300 text-gray-900 dark:bg-gray-600 dark:border-gray-500 dark:text-white'
                                : isToday(d)
                                    ? 'border-gray-300 bg-transparent text-gray-900 dark:border-gray-500 dark:text-white'
                                    : 'border-transparent bg-transparent shadow-none hover:bg-gray-100 dark:hover:bg-gray-700'
                    ]" @click="selectDay(d)">
                        {{ d ? d.getDate() : "" }}
                    </button>
                </div>
            </div>
        </teleport>
    </div>
</template>
