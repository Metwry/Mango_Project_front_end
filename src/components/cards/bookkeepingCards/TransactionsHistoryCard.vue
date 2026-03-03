<script setup>
import { computed, ref, reactive } from "vue";
import { onClickOutside } from "@vueuse/core";
import dayjs from "dayjs";
import DatePicker from "@/components/ui/DatePicker.vue";
import SmallAccountPicker from "@/components/ui/SmallAccountPicker.vue";
import BaseIcon from "@/components/ui/BaseIcon.vue";
import { formatCurrencyAmount } from "@/utils/formatters";
import { filterNonInvestmentAccounts } from "@/utils/accountFilters";

const props = defineProps({
    transactions: { type: Array, default: () => [] },
    accounts: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: [Boolean, Object, String, null], default: null },
    page: { type: Number, default: 1 },
    pageSize: { type: Number, default: 20 },
    total: { type: Number, default: 0 },
});

const emit = defineEmits([
    "page-change",
    "page-size-change",
    "reverse",
    "search-change",
    "search-reset",
    "open-add-transaction",
]);

const reversingId = ref(null);
const pageSizeOpen = ref(false);
const pageSizeWrapRef = ref(null);
const pageSizeOptions = [10, 20, 50, 100];

const searchState = reactive({
    accountId: "",
    counterparty: "",
    category: "",
    start: "",
    end: "",
});

const hasSearch = computed(() => Object.values(searchState).some(Boolean));
const searchableAccounts = computed(() => filterNonInvestmentAccounts(props.accounts));

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

const formatMoney = (amount, currency) => {
    return formatCurrencyAmount(amount, currency, { invalidText: "-", symbolOnly: true });
};

function formatDateTime(v) {
    if (!v) return "-";
    const d = dayjs(v);
    return d.isValid() ? d.format("YYYY-MM-DD HH:mm") : String(v);
}

function rowKey(tx, idx) {
    return tx?.id ?? `${idx}`;
}

const trimOrEmpty = (v) => (v ? String(v).trim() : "");

function emitSearch() {
    emit("search-change", {
        account_id: searchState.accountId || "",
        counterparty: trimOrEmpty(searchState.counterparty),
        category: trimOrEmpty(searchState.category),
        start: searchState.start || "",
        end: searchState.end || "",
    });
}

function getDisplayBalance(tx) {
    if (tx?.balance_after == null) return "-";
    return formatMoney(tx.balance_after, resolveCurrency(tx));
}

function amountSign(amount) {
    const num = Number(amount);
    if (!Number.isFinite(num) || num === 0) return 0;
    return num > 0 ? 1 : -1;
}

function amountToneClass(amount) {
    const sign = amountSign(amount);
    if (sign > 0) return "text-emerald-600 dark:text-emerald-400";
    if (sign < 0) return "text-red-600 dark:text-red-400";
    return "";
}

function amountDotClass(amount) {
    const sign = amountSign(amount);
    if (sign > 0) return "bg-emerald-500";
    if (sign < 0) return "bg-red-500";
    return "bg-gray-400 dark:bg-gray-500";
}

function categoryTagClass(tx) {
    const raw = String(tx?.category_name ?? tx?.category ?? "").toLowerCase();
    const buyTone = "bg-emerald-50/80 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/70";
    const sellTone = "bg-rose-50/80 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/70";
    const transferTone = "bg-sky-50/80 text-sky-600 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800/70";

    if (/买|buy|充值|入金|转入|收入|profit|refund|返现/.test(raw)) {
        return buyTone;
    }
    if (/卖|sell|支出|转出|提现|fee|tax|手续费|亏损/.test(raw)) {
        return sellTone;
    }
    if (/转账|transfer|调仓|换仓/.test(raw)) {
        return transferTone;
    }

    const sign = amountSign(tx?.amount);
    if (sign > 0) return buyTone;
    if (sign < 0) return sellTone;
    return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700/60 dark:text-gray-200 dark:border-gray-600";
}

function resolveCurrency(tx) {
    return getAccount(tx)?.currency ?? tx?.currency ?? tx?.account_currency ?? "";
}

function resetSearch() {
    Object.assign(searchState, {
        accountId: "",
        counterparty: "",
        category: "",
        start: "",
        end: "",
    });
    emit("search-reset");
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

function pickPageSize(ps) {
    const size = Number(ps) || props.pageSize;
    emit("page-size-change", size);
    pageSizeOpen.value = false;
}

function canReverse(tx) {
    return !tx?.reversal_of && !tx?.reversed_at;
}

function reverseLabel(tx) {
    if (tx?.reversal_of) return "撤销单";
    if (tx?.reversed_at) return "已撤销";
    return "撤销";
}

function onReverseClick(tx) {
    if (!tx?.id || !canReverse(tx)) return;

    reversingId.value = tx.id;
    emit("reverse", tx.id);
    setTimeout(() => (reversingId.value = null), 300);
}

onClickOutside(pageSizeWrapRef, () => {
    pageSizeOpen.value = false;
});
</script>

<template>
    <div class="card-base">
        <div class="card-title !justify-start gap-3 border-b border-gray-100 dark:border-gray-700/80 pb-3 mb-2">
            <span class="truncate">活动记录</span>

            <span
                class="hidden sm:inline-flex text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {{ total }} 条
            </span>
            <button class="button-base px-3 py-1.5 text-xs sm:text-sm" @click="emit('open-add-transaction')">
                添加交易
            </button>
        </div>

        <!-- 查询栏 -->
        <div class="px-1 py-2 mb-1">
            <div class="flex flex-wrap items-end gap-2.5 sm:gap-3">

                <div class="w-full min-w-0 sm:min-w-[220px] sm:flex-[1.6]">
                    <SmallAccountPicker v-model="searchState.accountId" :accounts="searchableAccounts" />
                </div>

                <div class="w-full sm:min-w-[150px] sm:flex-1">
                    <input v-model="searchState.counterparty" type="text" placeholder="交易方" class="input-base"
                        @keydown.enter="emitSearch" />
                </div>

                <div class="w-full sm:min-w-[130px] sm:flex-1">
                    <input v-model="searchState.category" type="text" placeholder="备注" class="input-base"
                        @keydown.enter="emitSearch" />
                </div>

                <div class="w-full sm:min-w-[170px] sm:flex-1">
                    <DatePicker v-model="searchState.start" class="w-full" />
                </div>

                <div class="w-full sm:min-w-[170px] sm:flex-1">
                    <DatePicker v-model="searchState.end" class="w-full" />
                </div>

                <div class="flex w-full sm:w-auto gap-2 sm:gap-3 sm:ml-auto">
                    <button class="button-base flex-1 sm:flex-none" @click="emitSearch">
                        查询
                    </button>
                    <button class="button-base flex-1 sm:flex-none" :disabled="!hasSearch" @click="resetSearch">
                        清空
                    </button>
                </div>
            </div>
        </div>

        <div v-if="loading" class="text-base">
            <BaseIcon name="spinner" spin :size="30" />
        </div>
        <div v-else-if="error" class="text-base">
            加载失败，请重试
        </div>

        <div v-else
            class="flex-1 min-h-0 overflow-x-auto overflow-y-auto scrollbar-thin rounded-2xl border border-gray-100 dark:border-gray-700/70 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
            <table class="w-full min-w-[840px] text-left border-collapse table-auto">
                <thead class="sticky top-0 z-10 backdrop-blur-md bg-gray-50/95 dark:bg-gray-900/95">
                    <tr>
                        <th class="th-text">账户</th>
                        <th class="th-text">交易方</th>
                        <th class="th-text ">备注</th>
                        <th class="th-text text-right">金额</th>
                        <th class="th-text text-right">余额</th>
                        <th class="th-text text-right">日期</th>
                        <th class="th-text text-center">操作</th>
                    </tr>
                </thead>

                <tbody class="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    <tr v-for="(tx, idx) in transactions" :key="rowKey(tx, idx)" :class="[
                        'transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer',
                        idx % 2 === 1 && 'bg-gray-50/40 dark:bg-gray-800/80',
                        (tx?.reversal_of || tx?.reversed_at) && 'opacity-75'
                    ]">

                        <td class="px-2 py-2">
                            <div class="max-w-[180px]">
                                <span
                                    class="inline-flex text-xs px-2 py-1.5 font-medium rounded-xl bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 truncate">
                                    {{ getAccount(tx)?.name ?? "-" }}
                                </span>
                            </div>
                        </td>
                        <td class="td-cell">
                            <div
                                class="max-w-[290px] truncate text-[13px] sm:text-sm font-semibold text-gray-700 dark:text-gray-100">
                                {{ tx?.counterparty ?? tx?.title ?? "-" }}
                            </div>
                        </td>
                        <td class="td-cell">
                            <span :class="[
                                'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
                                categoryTagClass(tx)
                            ]">
                                {{ tx?.category_name ?? tx?.category ?? "-" }}
                            </span>
                        </td>
                        <td class="td-cell text-right tabular-nums font-semibold" :class="amountToneClass(tx?.amount)">
                            <div class="inline-flex items-center gap-1.5">
                                <span class="inline-block h-1.5 w-1.5 rounded-full"
                                    :class="amountDotClass(tx?.amount)"></span>
                                <span>{{ formatMoney(tx?.amount, resolveCurrency(tx)) }}</span>
                            </div>
                        </td>
                        <td class="td-cell text-right tabular-nums">{{ getDisplayBalance(tx) }}</td>
                        <td class="td-cell text-right whitespace-nowrap">
                            <div class="font-medium">{{ formatDateTime(tx?.add_date ?? tx?.date) }}</div>
                        </td>
                        <td class="td-cell text-center" @click.stop>
                            <button :class="[
                                'button-base ring-0 inline-flex text-xs !px-2.5 !py-1.5',
                                canReverse(tx)
                                    ? 'hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20'
                                    : '!cursor-default !bg-gray-100 dark:!bg-gray-700/60 !text-gray-400 dark:!text-gray-500 !border-transparent'
                            ]" @click="onReverseClick(tx)">
                                {{ reversingId === tx?.id ? "处理中..." : reverseLabel(tx) }}
                            </button>
                        </td>
                    </tr>

                    <!-- 无交易记录 -->
                    <tr v-if="transactions.length === 0">
                        <td colspan="7" class="px-6 py-16 text-center">
                            <span class=" text-gray-400 dark:text-gray-500">暂无交易记录</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- 分页栏 -->
        <div class="px-1 pt-3 pb-1 grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] items-center gap-3">

            <div ref="pageSizeWrapRef" class="flex items-center gap-2 justify-self-start relative">
                <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">每页</span>
                <div class="relative min-w-[102px]">
                    <button class="dropdown-trigger !h-9 min-w-[102px]"
                        :disabled="loading" @click="pageSizeOpen = !pageSizeOpen">
                        <span class="text-sm">{{ pageSize }} 条</span>
                        <BaseIcon name="arrow" :size="14"
                            :class="['dropdown-arrow', pageSizeOpen && 'rotate-180']" />
                    </button>

                    <Transition name="dropdown-drawer">
                        <div v-if="pageSizeOpen"
                            class="dropdown-panel dropdown-panel-up absolute left-0 bottom-[calc(100%+8px)] min-w-[102px]">
                            <div class="dropdown-list !max-h-56">
                            <button v-for="size in pageSizeOptions" :key="size" type="button" :class="[
                                'dropdown-item',
                                Number(pageSize) === size
                                    ? 'dropdown-item-active'
                                    : 'dropdown-item-idle'
                            ]" @click="pickPageSize(size)">
                                {{ size }} 条
                            </button>
                            </div>
                        </div>
                    </Transition>
                </div>
            </div>

            <div class="flex items-center justify-center gap-1 justify-self-center shrink-0">
                <button class="button-base" :disabled="loading || page <= 1" @click="goPage(page - 1)">
                    <BaseIcon name="leftArrow" class="!w-3 !h-3" />
                </button>

                <span class="text-base">
                    {{ page }} / {{ totalPages }}
                </span>

                <button class="button-base" :disabled="loading || page >= totalPages" @click="goPage(page + 1)">
                    <BaseIcon name="rightArrow" class="!w-3 !h-3" />
                </button>
            </div>

        </div>

    </div>
</template>
