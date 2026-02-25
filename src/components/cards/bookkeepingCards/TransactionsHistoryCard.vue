<script setup>
import { computed, ref, reactive } from "vue";
import dayjs from "dayjs";
import DatePicker from "@/components/ui/DatePicker.vue";
import SmallAccountPicker from "@/components/ui/SmallAccountPicker.vue";
import BaseIcon from "@/components/ui/BaseIcon.vue";

const props = defineProps({
    transactions: { type: Array, default: () => [] },
    accounts: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: [Boolean, Object, String, null], default: null },
    page: { type: Number, default: 1 },
    pageSize: { type: Number, default: 20 },
    total: { type: Number, default: 0 },
});

const emit = defineEmits(["page-change", "page-size-change", "reverse", "search-change", "search-reset"]);

const reversingId = ref(null);

const searchState = reactive({
    accountId: "",
    counterparty: "",
    category: "",
    start: "",
    end: "",
});

const hasSearch = computed(() => Object.values(searchState).some(Boolean));

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
    const currency = getAccount(tx)?.currency ?? tx?.currency ?? tx?.account_currency;
    return formatMoney(tx.balance_after, currency);
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

function onPageSizeChange(e) {
    const ps = Number(e?.target?.value) || props.pageSize;
    emit("page-size-change", ps);
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
</script>

<template>
    <div class="card-base">
        <div class="card-title">活动记录</div>

        <!-- 查询栏 -->
        <div class="px-1 py-2 ">
            <div class="flex flex-wrap gap-3 items-end">

                <div class="flex-1 min-w-[250px]">
                    <SmallAccountPicker v-model="searchState.accountId" :accounts="accounts" />
                </div>

                <div class="flex-1 min-w-[100px]">
                    <input v-model="searchState.counterparty" type="text" placeholder="交易方" class="input-base"
                        @keydown.enter="emitSearch" />
                </div>

                <div class="flex-1 min-w-[80px]">
                    <input v-model="searchState.category" type="text" placeholder="类型" class="input-base"
                        @keydown.enter="emitSearch" />
                </div>

                <div class="flex-[2] min-w-[100px]">
                    <DatePicker v-model="searchState.start" class="w-full" />
                </div>

                <div class="flex-[2] min-w-[100px]">
                    <DatePicker v-model="searchState.end" class="w-full" />
                </div>

                <div class="flex gap-3">
                    <button class="button-base " @click="emitSearch">
                        查询
                    </button>
                    <button class="button-base" :disabled="!hasSearch" @click="resetSearch">
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

        <div v-else class="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin">
            <table class="w-full min-w-[900px] text-left border-collapse table-auto ">
                <thead class="sticky top-0 z-10 backdrop-blur-xl bg-gray-100 dark:bg-gray-900 ">
                    <tr>
                        <th class="th-text">账户</th>
                        <th class="th-text">交易方</th>
                        <th class="th-text ">类型</th>
                        <th class="th-text text-right">金额</th>
                        <th class="th-text text-right">余额</th>
                        <th class="th-text text-right">日期</th>
                        <th class="th-text text-center">操作</th>
                    </tr>
                </thead>

                <tbody class="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    <tr v-for="(tx, idx) in transactions" :key="rowKey(tx, idx)"
                        class=" transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">

                        <td class="px-2 py-2">
                            <span
                                class="inline-flex text-xs px-2 py-1.5 font-medium rounded-xl bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 truncate  ">
                                {{ getAccount(tx)?.name ?? "-" }}
                            </span>
                        </td>
                        <td class="td-cell "> {{ tx?.counterparty ?? tx?.title ?? "-" }}</td>
                        <td class="td-cell ">{{ tx?.category_name ?? tx?.category ?? "-" }}</td>
                        <td class="td-cell text-right">{{ formatMoney(tx?.amount, getAccount(tx)?.currency ??
                            tx?.currency ?? tx?.account_currency) }}
                        </td>
                        <td class="td-cell text-right">{{ getDisplayBalance(tx) }}</td>
                        <td class="td-cell text-right ">{{ formatDate(tx?.add_date ?? tx?.date) }}</td>
                        <td class="td-cell text-center" @click.stop>
                            <button class="button-base ring-0 inline-flex  text-xs
                                hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20
                                " @click="onReverseClick(tx)">
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
        <div class="px-1 py-1 flex flex-row  items-center justify-between ">

            <div class="relative">
                <select class="select-base h-9 text-sm" :disabled="loading" :value="pageSize"
                    @change="onPageSizeChange">
                    <option :value="10">10 条</option>
                    <option :value="20">20 条</option>
                    <option :value="50">50 条</option>
                    <option :value="100">100 条</option>
                </select>
            </div>

            <div class="flex items-center justify-center gap-1 shrink-0">
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

            <div class="text-xs text-gray-500 dark:text-gray-400 tabular-nums text-right shrink-0 whitespace-nowrap">
                {{ total }} 条记录
            </div>
        </div>

    </div>
</template>
