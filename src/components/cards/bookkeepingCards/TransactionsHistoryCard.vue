<script setup>
import { computed, ref } from "vue";
import dayjs from "dayjs";

const props = defineProps({
    transactions: { type: Array, default: () => [] },
    accounts: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: [Boolean, Object, String, null], default: null },

    // 分页
    page: { type: Number, default: 1 },
    pageSize: { type: Number, default: 20 },
    total: { type: Number, default: 0 },
});

const emit = defineEmits(["page-change", "page-size-change", "reverse"]);

const reversingId = ref(null);

const accountMap = computed(() => {
    const map = new Map();
    for (const a of props.accounts) map.set(a.id, a);
    return map;
});

function getAccount(tx) {
    const v = tx?.account;
    if (v && typeof v === "object") return v;
    return accountMap.value.get(v) ?? null;
}

function formatMoney(amount, currency) {
    const n = Number(amount);
    if (!Number.isFinite(n)) return "-";

    const c = (currency || "CNY").toUpperCase();
    try {
        return new Intl.NumberFormat("zh-CN", {
            style: "currency",
            currency: c,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(n);
    } catch {
        return n.toFixed(2);
    }
}

function formatDate(v) {
    if (!v) return "-";
    const d = dayjs(v);
    return d.isValid() ? d.format("YYYY-MM-DD HH:mm") : String(v);
}

function rowKey(tx, idx) {
    return tx?.id ?? `${idx}`;
}

// ===== 分页 =====
const totalPages = computed(() => {
    const ps = Number(props.pageSize) || 20;
    return Math.max(1, Math.ceil((props.total || 0) / ps));
});

function goPage(p) {
    const np = Math.min(Math.max(1, p), totalPages.value);
    if (np !== props.page) emit("page-change", np);
}

function onPageSizeChange(e) {
    const ps = Number(e?.target?.value) || props.pageSize;
    emit("page-size-change", ps);
}

// ===== 冲正 =====
function canReverse(tx) {
    // 原交易：reversal_of 为空；未冲正：reversed_at 为空
    return !tx?.reversal_of && !tx?.reversed_at;
}

function reverseLabel(tx) {
    if (tx?.reversal_of) return "撤销单";
    if (tx?.reversed_at) return "已撤销";
    return "撤销";
}

async function onReverseClick(tx) {
    if (!tx?.id) return;
    if (!canReverse(tx)) return;

    // 简单前端防抖：同一条冲正中禁点
    reversingId.value = tx.id;
    try {
        emit("reverse", tx.id);
    } finally {
        // 这里不等父组件完成也可以清空；
        // 如果你希望严格等父组件完成，可以让父组件传一个 props 再控制
        setTimeout(() => (reversingId.value = null), 300);
    }
}
</script>

<template>
    <div
        class="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden h-full flex flex-col select-none">

        <div
            class="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
            <h3 class="font-bold text-lg text-gray-800 dark:text-gray-100 tracking-tight">交易记录</h3>
        </div>

        <div v-if="loading" class="flex-1 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                </path>
            </svg>
            加载数据中...
        </div>
        <div v-else-if="error"
            class="flex-1 flex items-center justify-center text-sm text-red-600 bg-red-50 dark:bg-red-900/20">
            加载失败，请重试
        </div>

        <div v-else
            class="flex-1 min-h-0 overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
            <table class="w-full text-left border-collapse table-fixed">
                <thead class="bg-gray-50/80 dark:bg-gray-900/50 sticky top-0 z-10 backdrop-blur-sm">
                    <tr>
                        <th
                            class="w-[15%] px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                            账户</th>
                        <th
                            class="w-[20%] px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                            交易方 / 标题</th>
                        <th
                            class="w-[10%] px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                            分类</th>
                        <th
                            class="w-[15%] px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400 text-right">
                            金额</th>
                        <th
                            class="w-[15%] px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400 text-right">
                            余额</th>
                        <th
                            class="w-[15%] px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400 text-right">
                            日期</th>
                        <th
                            class="w-[10%] px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400 text-center">
                            操作</th>
                    </tr>
                </thead>

                <tbody class="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    <tr v-for="(tx, idx) in transactions" :key="rowKey(tx, idx)"
                        class="group transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">

                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <span
                                    class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 truncate max-w-full">
                                    {{ getAccount(tx)?.name ?? "-" }}
                                </span>
                            </div>
                        </td>

                        <td class="px-6 py-4">
                            <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
                                :title="tx?.counterparty ?? tx?.title">
                                {{ tx?.counterparty ?? tx?.title ?? "-" }}
                            </div>
                        </td>

                        <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 truncate">
                            {{ tx?.category_name ?? tx?.category ?? "-" }}
                        </td>

                        <td class="px-6 py-4 text-right">
                            <span class="text-sm font-medium font-mono tracking-tight"
                                :class="Number(tx?.amount) >= 0 ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'">
                                {{ formatMoney(tx?.amount, getAccount(tx)?.currency ?? tx?.currency ??
                                    tx?.account_currency) }}
                            </span>
                        </td>

                        <td class="px-6 py-4 text-right">
                            <span class="text-sm text-gray-500 dark:text-gray-400 font-mono tracking-tight">
                                {{ tx?.balance_after !== undefined && tx?.balance_after !== null
                                    ? formatMoney(tx.balance_after, getAccount(tx)?.currency ?? tx?.currency ??
                                        tx?.account_currency)
                                    : "-" }}
                            </span>
                        </td>

                        <td class="px-6 py-4 text-right text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                            {{ formatDate(tx?.add_date ?? tx?.date) }}
                        </td>

                        <td class="px-6 py-4 text-center" @click.stop>
                            <button type="button"
                                class="inline-flex items-center justify-center rounded-lg text-xs font-medium px-2.5 py-1.5 transition-colors
                                       text-gray-500 hover:text-red-600 hover:bg-red-50 
                                       dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20
                                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent cursor-pointer disabled:hover:text-gray-500"
                                :disabled="loading || !canReverse(tx) || reversingId === tx?.id"
                                @click="onReverseClick(tx)">
                                {{ reversingId === tx?.id ? "处理中..." : reverseLabel(tx) }}
                            </button>
                        </td>
                    </tr>

                    <tr v-if="transactions.length === 0">
                        <td colspan="7" class="px-6 py-16 text-center">
                            <div class="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                                <svg class="w-10 h-10 mb-3 opacity-50" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2">
                                    </path>
                                </svg>
                                <span class="text-sm">暂无交易记录</span>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-if="!loading && !error"
            class="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 flex items-center justify-between gap-4">

            <div class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                共 <span class="font-medium text-gray-700 dark:text-gray-300">{{ total }}</span> 条记录
            </div>

            <div class="flex items-center gap-3">
                <div class="relative">
                    <select
                        class="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 cursor-pointer"
                        :disabled="loading" :value="pageSize" @change="onPageSizeChange">
                        <option :value="10">10 条/页</option>
                        <option :value="20">20 条/页</option>
                        <option :value="50">50 条/页</option>
                        <option :value="100">100 条/页</option>
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">

                    </div>
                </div>

                <div class="flex items-center gap-1">
                    <button
                        class="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-white hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                        :disabled="loading || page <= 1" @click="goPage(page - 1)" title="上一页">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <span class="text-xs font-medium text-gray-600 dark:text-gray-300 px-2 tabular-nums">
                        {{ page }} / {{ totalPages }}
                    </span>

                    <button
                        class="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-white hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                        :disabled="loading || page >= totalPages" @click="goPage(page + 1)" title="下一页">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
