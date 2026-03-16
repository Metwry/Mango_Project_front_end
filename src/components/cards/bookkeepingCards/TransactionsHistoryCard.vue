<script setup>
import { computed, ref, reactive, watch } from "vue";
import { onClickOutside } from "@vueuse/core";
import dayjs from "dayjs";
import DatePicker from "@/components/ui/DatePicker.vue";
import SmallAccountPicker from "@/components/ui/SmallAccountPicker.vue";
import BaseIcon from "@/components/ui/BaseIcon.vue";
import { formatCurrencyAmount } from "@/utils/formatters";
import { filterNonInvestmentAccounts } from "@/utils/accounts";
import { TRANSACTION_HISTORY_MODE } from "@/utils/transaction.js";

const props = defineProps({
    transactions: { type: Array, default: () => [] },
    accounts: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: [Boolean, Object, String, null], default: null },
    page: { type: Number, default: 1 },
    pageSize: { type: Number, default: 20 },
    total: { type: Number, default: 0 },
    historyMode: { type: String, default: TRANSACTION_HISTORY_MODE.ACTIVITY },
    deletingId: { type: [Number, String], default: null },
    clearingAll: { type: Boolean, default: false },
});

const emit = defineEmits([
    "page-change",
    "page-size-change",
    "reverse",
    "search-change",
    "search-reset",
    "mode-change",
    "delete-one",
    "delete-all",
    "open-add-transaction",
]);

const reversingId = ref(null);
const pageSizeOpen = ref(false);
const pageSizeWrapRef = ref(null);
const historyModeOpen = ref(false);
const historyModeWrapRef = ref(null);
const filtersOpen = ref(false);
const pageSizeOptions = [10, 20, 50, 100];
const historyModeOptions = [
    { value: TRANSACTION_HISTORY_MODE.ACTIVITY, label: "活动记录" },
    { value: TRANSACTION_HISTORY_MODE.ALL, label: "投资记录" },
    { value: TRANSACTION_HISTORY_MODE.TRANSFER, label: "转账记录" },
    { value: TRANSACTION_HISTORY_MODE.REVERSED, label: "已撤销记录" },
];

const searchState = reactive({
    accountId: "",
    transferAccountId: "",
    counterparty: "",
    category: "",
    start: "",
    end: "",
});

const searchableAccounts = computed(() => filterNonInvestmentAccounts(props.accounts));
const isReversedMode = computed(() => props.historyMode === TRANSACTION_HISTORY_MODE.REVERSED);
const isInvestmentHistoryMode = computed(() => props.historyMode === TRANSACTION_HISTORY_MODE.ALL);
const isTransferHistoryMode = computed(() => props.historyMode === TRANSACTION_HISTORY_MODE.TRANSFER);
const isManualMode = computed(() => props.historyMode === TRANSACTION_HISTORY_MODE.ACTIVITY);
const currentSearchEntries = computed(() => {
    const sharedEntries = [
        searchState.accountId,
        searchState.category,
        searchState.start,
        searchState.end,
    ];
    if (isTransferHistoryMode.value) {
        return [...sharedEntries, searchState.transferAccountId];
    }
    return [...sharedEntries, searchState.counterparty];
});
const hasSearch = computed(() => currentSearchEntries.value.some(Boolean));
const activeSearchCount = computed(() => currentSearchEntries.value.filter(Boolean).length);
const currentHistoryModeLabel = computed(() => {
    return historyModeOptions.find((item) => item.value === props.historyMode)?.label ?? "活动记录";
});

const accountMap = computed(() => {
    const map = new Map();
    for (const a of props.accounts) map.set(a.id, a);
    return map;
});

function getAccount(tx) {
    const v = tx?.account;
    if (v && typeof v === "object") return v;
    const account = accountMap.value.get(v);
    if (account) return account;
    if (tx?.account_name || tx?.currency) {
        return {
            name: tx?.account_name ?? "",
            currency: tx?.currency ?? "",
        };
    }
    return null;
}

function getTransferAccount(tx) {
    const v = tx?.transfer_account;
    if (v && typeof v === "object") return v;
    const account = accountMap.value.get(v);
    if (account) return account;
    if (tx?.transfer_account_name) {
        return {
            name: tx.transfer_account_name,
            currency: tx?.currency ?? "",
        };
    }
    return null;
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
    filtersOpen.value = false;
    emit("search-change", {
        account_id: searchState.accountId || "",
        transfer_account_id: isTransferHistoryMode.value ? searchState.transferAccountId || "" : "",
        counterparty: isTransferHistoryMode.value ? "" : trimOrEmpty(searchState.counterparty),
        category: trimOrEmpty(searchState.category),
        start: searchState.start || "",
        end: searchState.end || "",
    });
}

function pickHistoryMode(mode) {
    historyModeOpen.value = false;
    if (!mode || mode === props.historyMode) return;
    emit("mode-change", mode);
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
    const buyTone = "bg-emerald-50/80 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300";
    const sellTone = "bg-rose-50/80 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300";

    const sign = amountSign(tx?.amount);
    if (sign > 0) return buyTone;
    if (sign < 0) return sellTone;
    return "bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-200";
}

function resolveCurrency(tx) {
    return getAccount(tx)?.currency ?? tx?.currency ?? tx?.account_currency ?? "";
}

function resetSearch() {
    Object.assign(searchState, {
        accountId: "",
        transferAccountId: "",
        counterparty: "",
        category: "",
        start: "",
        end: "",
    });
    filtersOpen.value = false;
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
    if (!isManualMode.value) return false;
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

function onDeleteOneClick(tx) {
    if (!tx?.id) return;
    emit("delete-one", tx.id);
}

function onDeleteAllClick() {
    emit("delete-all");
}

onClickOutside(pageSizeWrapRef, () => {
    pageSizeOpen.value = false;
});

onClickOutside(historyModeWrapRef, () => {
    historyModeOpen.value = false;
});

watch(
    () => props.historyMode,
    (mode) => {
        if (mode === TRANSACTION_HISTORY_MODE.TRANSFER) {
            searchState.counterparty = "";
            return;
        }
        searchState.transferAccountId = "";
    },
);
</script>

<template>
    <div class="card-base">
        <div class="card-title !justify-start gap-2.5 sm:gap-3 border-b border-gray-100 dark:border-gray-700/80 pb-3 mb-2 flex-wrap">
            <div ref="historyModeWrapRef" class="relative min-w-[122px] flex-1 sm:flex-none">
                <button class="dropdown-trigger !h-9 min-w-[122px]" @click="historyModeOpen = !historyModeOpen">
                    <span class="truncate text-sm font-medium text-gray-700 dark:text-gray-200">{{
                        currentHistoryModeLabel }}</span>
                    <BaseIcon name="arrow" :size="14" :class="['dropdown-arrow', historyModeOpen && 'rotate-180']" />
                </button>

                <Transition name="dropdown-drawer">
                    <div v-if="historyModeOpen"
                        class="dropdown-panel absolute left-0 top-[calc(100%+8px)] min-w-[122px] z-20">
                        <div class="dropdown-list !max-h-56">
                            <button v-for="mode in historyModeOptions" :key="mode.value" type="button" :class="[
                                'dropdown-item font-medium',
                                props.historyMode === mode.value
                                    ? 'dropdown-item-active'
                                    : 'dropdown-item-idle'
                            ]" @click="pickHistoryMode(mode.value)">
                                {{ mode.label }}
                            </button>
                        </div>
                    </div>
                </Transition>
            </div>

            <span
                class="inline-flex text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 order-last sm:order-none">
                {{ total }} 条
            </span>
            <button class="button-base px-3 py-1.5 text-xs sm:text-sm" @click="emit('open-add-transaction')">
                记账
            </button>
            <button
                class="button-base !rounded-xl !font-semibold px-3 py-1.5 text-xs sm:text-sm !bg-red-50 !text-red-700 !border-transparent hover:!bg-red-100 dark:!bg-[#34191d] dark:!text-red-200 dark:!border-transparent dark:hover:!bg-[#482126]"
                :disabled="loading || clearingAll || transactions.length === 0" @click="onDeleteAllClick">
                {{ clearingAll ? "删除中..." : "全部删除" }}
            </button>
        </div>

        <!-- 查询栏 -->
        <div class="px-1 py-2 mb-1">
            <div class="mobile-search-shell md:hidden">
                <div class="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                    <div class="mobile-account-field min-w-0">
                        <SmallAccountPicker v-model="searchState.accountId" :accounts="searchableAccounts" />
                    </div>

                    <button type="button"
                        class="button-base mobile-action-button !px-3 !py-2 text-xs"
                        @click="filtersOpen = !filtersOpen">
                        <span>筛选</span>
                        <span v-if="activeSearchCount > 0"
                            class="preserve-dark-white inline-flex min-w-5 items-center justify-center rounded-full bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold text-white dark:bg-gray-100 dark:text-gray-900">
                            {{ activeSearchCount }}
                        </span>
                    </button>

                    <button type="button" class="button-base mobile-action-button !px-3 !py-2 text-xs" @click="emitSearch">
                        查询
                    </button>
                </div>

                <Transition name="mobile-filter-panel">
                    <div v-if="filtersOpen" class="mobile-filter-panel mt-2.5">
                        <div class="grid grid-cols-2 gap-2">
                            <div class="col-span-2">
                                <SmallAccountPicker v-if="isTransferHistoryMode" v-model="searchState.transferAccountId"
                                    :accounts="searchableAccounts" placeholder="收款账户" />
                                <input v-else v-model="searchState.counterparty" type="text" placeholder="交易方"
                                    class="input-base mobile-filter-input" @keydown.enter="emitSearch" />
                            </div>

                            <div class="col-span-2">
                                <input v-model="searchState.category" type="text" placeholder="备注"
                                    class="input-base mobile-filter-input" @keydown.enter="emitSearch" />
                            </div>

                            <div class="mobile-date-field col-span-1">
                                <DatePicker v-model="searchState.start" class="w-full" />
                            </div>

                            <div class="mobile-date-field col-span-1">
                                <DatePicker v-model="searchState.end" class="w-full" />
                            </div>
                        </div>

                        <div class="mt-2 grid grid-cols-2 gap-2">
                            <button type="button"
                                class="button-base mobile-action-button !px-3 !py-2 text-xs"
                                :disabled="!hasSearch" @click="resetSearch">
                                清空
                            </button>
                            <button type="button"
                                class="button-base mobile-action-button !px-3 !py-2 text-xs"
                                @click="filtersOpen = false">
                                收起
                            </button>
                        </div>
                    </div>
                </Transition>
            </div>

            <div class="hidden md:flex flex-wrap items-end gap-2.5 sm:gap-3">

                <div class="w-full min-w-0 sm:min-w-[220px] sm:flex-[1.6]">
                    <SmallAccountPicker v-model="searchState.accountId" :accounts="searchableAccounts" />
                </div>

                <div class="w-full sm:min-w-[150px] sm:flex-1">
                    <SmallAccountPicker v-if="isTransferHistoryMode" v-model="searchState.transferAccountId"
                        :accounts="searchableAccounts" placeholder="收款账户" />
                    <input v-else v-model="searchState.counterparty" type="text" placeholder="交易方" class="input-base"
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

        <div v-if="loading" class="status-base">
            <BaseIcon name="spinner" spin :size="30" />
        </div>
        <div v-else-if="error" class="status-base">
            加载失败，请重试
        </div>

        <div v-else
            class="flex-1 min-h-0 overflow-x-auto overflow-y-auto scrollbar-thin rounded-2xl border border-gray-100 dark:border-gray-700/70 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
            <table :class="[
                'history-table w-full text-left border-collapse table-auto',
                isTransferHistoryMode ? 'min-w-[760px]' : 'min-w-[840px]'
            ]">
                <thead class="sticky top-0 z-10 backdrop-blur-md bg-gray-50/95 dark:bg-gray-900/95">
                    <tr v-if="isTransferHistoryMode">
                        <th class="th-text">转账账户</th>
                        <th class="th-text text-right">转账金额</th>
                        <th class="th-text">收款账户</th>
                        <th class="th-text">备注</th>
                        <th class="th-text text-right">日期</th>
                        <th class="th-text text-center">操作</th>
                    </tr>
                    <tr v-else>
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
                        <template v-if="isTransferHistoryMode">
                            <td class="px-2 py-2">
                                <div class="max-w-[180px]">
                                    <span
                                        class="inline-flex text-xs px-2 py-1.5 font-medium rounded-xl bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 truncate">
                                        {{ getAccount(tx)?.name ?? "-" }}
                                    </span>
                                </div>
                            </td>
                            <td class="td-cell text-right tabular-nums font-semibold" :class="amountToneClass(tx?.amount)">
                                <div class="inline-flex items-center gap-1.5">
                                    <span class="inline-block h-1.5 w-1.5 rounded-full"
                                        :class="amountDotClass(tx?.amount)"></span>
                                    <span>{{ formatMoney(tx?.amount, resolveCurrency(tx)) }}</span>
                                </div>
                            </td>
                            <td class="td-cell">
                                <div
                                    class="max-w-[240px] truncate text-[13px] sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {{ getTransferAccount(tx)?.name ?? "-" }}
                                </div>
                            </td>
                            <td class="td-cell">
                                <div class="max-w-[280px] truncate text-[13px] sm:text-sm text-gray-700 dark:text-gray-300">
                                    {{ tx?.remark ?? "-" }}
                                </div>
                            </td>
                            <td class="td-cell text-right whitespace-nowrap">
                                <div class="font-medium">{{ formatDateTime(tx?.add_date ?? tx?.date) }}</div>
                            </td>
                            <td class="td-cell text-center" @click.stop>
                                <button :class="[
                                    'button-base ring-0 inline-flex !rounded-xl !font-semibold text-xs !px-2.5 !py-1.5 !bg-red-50 !text-red-700 !border-transparent hover:!bg-red-100 dark:!bg-[#34191d] dark:!text-red-200 dark:!border-transparent dark:hover:!bg-[#482126]',
                                    (!tx?.id || clearingAll) && '!cursor-not-allowed !opacity-60'
                                ]" :disabled="!tx?.id || clearingAll" @click="onDeleteOneClick(tx)">
                                    {{ deletingId === tx?.id ? "删除中..." : "删除" }}
                                </button>
                            </td>
                        </template>
                        <template v-else>
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
                                    class="max-w-[290px] truncate text-[13px] sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {{ tx?.counterparty ?? tx?.title ?? "-" }}
                                </div>
                            </td>
                            <td class="td-cell">
                                <span :class="[
                                    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
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
                                <button v-if="isManualMode" :class="[
                                    'button-base ring-0 inline-flex text-xs !px-2.5 !py-1.5',
                                    canReverse(tx)
                                        ? 'hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20'
                                        : '!cursor-default !bg-gray-100 dark:!bg-gray-700/60 !text-gray-400 dark:!text-gray-500 !border-transparent'
                                ]" @click="onReverseClick(tx)">
                                    {{ reversingId === tx?.id ? "处理中..." : reverseLabel(tx) }}
                                </button>
                                <button :class="[
                                    'button-base ring-0 inline-flex !rounded-xl !font-semibold text-xs !px-2.5 !py-1.5 !bg-red-50 !text-red-700 !border-transparent hover:!bg-red-100 dark:!bg-[#34191d] dark:!text-red-200 dark:!border-transparent dark:hover:!bg-[#482126]',
                                    (!tx?.id || clearingAll) && '!cursor-not-allowed !opacity-60'
                                ]" :disabled="!tx?.id || clearingAll" @click="onDeleteOneClick(tx)">
                                    {{ deletingId === tx?.id ? "删除中..." : "删除" }}
                                </button>
                            </td>
                        </template>
                    </tr>

                    <!-- 无交易记录 -->
                    <tr v-if="transactions.length === 0">
                        <td :colspan="isTransferHistoryMode ? 6 : 7" class="px-6 py-16 text-center">
                            <span class=" text-gray-400 dark:text-gray-500">
                                {{ isReversedMode ? "暂无已撤销记录" : isInvestmentHistoryMode ? "暂无投资交易记录" : isTransferHistoryMode ? "暂无转账记录" : "暂无交易记录" }}
                            </span>
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
                    <button class="dropdown-trigger !h-9 min-w-[102px]" :disabled="loading"
                        @click="pageSizeOpen = !pageSizeOpen">
                        <span class="text-sm">{{ pageSize }} 条</span>
                        <BaseIcon name="arrow" :size="14" :class="['dropdown-arrow', pageSizeOpen && 'rotate-180']" />
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

                <span class="status-base">
                    {{ page }} / {{ totalPages }}
                </span>

                <button class="button-base" :disabled="loading || page >= totalPages" @click="goPage(page + 1)">
                    <BaseIcon name="rightArrow" class="!w-3 !h-3" />
                </button>
            </div>

        </div>

    </div>
</template>

<style scoped>
.mobile-search-shell {
    padding: 0.25rem 0;
}

.mobile-filter-panel {
    border: 1px solid var(--border-subtle);
    border-radius: 1rem;
    background: var(--surface-2);
    padding: 0.75rem;
    box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
}

.mobile-filter-input {
    min-height: 2.5rem;
    padding-inline: 0.875rem;
    padding-block: 0.625rem;
    font-size: 0.875rem;
}

.mobile-action-button {
    min-height: 2.5rem;
    white-space: nowrap;
}

.mobile-account-field :deep(.dropdown-trigger),
.mobile-date-field :deep(.button-base) {
    min-height: 2.5rem;
    border-radius: 0.95rem;
    padding-inline: 0.875rem;
    font-size: 0.875rem;
}

.mobile-filter-panel-enter-active,
.mobile-filter-panel-leave-active {
    transition: opacity 0.18s ease, transform 0.18s ease;
}

.mobile-filter-panel-enter-from,
.mobile-filter-panel-leave-to {
    opacity: 0;
    transform: translateY(-6px);
}

:global(.dark) .mobile-filter-panel {
    border-color: var(--border-subtle);
    background: var(--surface-2);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.24);
}

:global(.dark) .mobile-filter-panel .mobile-filter-input,
:global(.dark) .mobile-filter-panel .dropdown-trigger,
:global(.dark) .mobile-filter-panel .mobile-date-field .button-base {
    background-color: var(--surface-2);
    border-color: var(--border-subtle);
    color: var(--text-primary);
}

:global(.dark) .mobile-filter-panel .mobile-action-button {
    background-color: var(--surface-2);
    border-color: var(--border-subtle);
    color: var(--text-primary);
}

:global(.dark) .mobile-filter-panel .mobile-action-button:hover {
    background-color: var(--surface-hover);
}
</style>
