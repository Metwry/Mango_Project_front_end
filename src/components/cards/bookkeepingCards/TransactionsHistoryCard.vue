<script setup>
import { computed } from "vue";
import dayjs from "dayjs";

const props = defineProps({
    transactions: { type: Array, default: () => [] },
    accounts: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: [Boolean, Object, String, null], default: null },
});

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
</script>

<template>
    <div
        class="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden h-full">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h3 class="font-bold text-gray-700 dark:text-gray-200">交易记录</h3>
        </div>

        <div v-if="loading" class="p-6 text-sm text-gray-500 dark:text-gray-400">加载中...</div>
        <div v-else-if="error" class="p-6 text-sm text-red-600">加载失败</div>

        <div v-else class="h-full overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead class="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                    <tr>
                        <th class="px-6 py-3 font-medium">交易方</th>
                        <th class="px-6 py-3 font-medium">账户</th>
                        <th class="px-6 py-3 font-medium">分类</th>
                        <th class="px-6 py-3 font-medium">金额</th>
                        <th class="px-6 py-3 font-medium">余额</th>
                        <th class="px-6 py-3 font-medium ">日期</th>
                    </tr>
                </thead>

                <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                    <tr v-for="(tx, idx) in transactions" :key="rowKey(tx, idx)"
                        class="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                        <td class="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">
                            {{ tx?.counterparty ?? tx?.title ?? "-" }}
                        </td>

                        <td class="px-6 py-4">
                            <span class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                {{ getAccount(tx)?.name ?? "-" }}
                            </span>
                        </td>

                        <td class="px-6 py-4">{{ tx?.category_name ?? tx?.category ?? "-" }}</td>

                        <td class="px-6 py-4 font-bold">
                            {{
                                formatMoney(
                                    tx?.amount,
                                    getAccount(tx)?.currency ?? tx?.currency ?? tx?.account_currency,
                                )
                            }}
                        </td>

                        <td class="px-6 py-4">
                            {{
                                tx?.balance_after !== undefined && tx?.balance_after !== null
                                    ? formatMoney(
                                        tx.balance_after,
                                        getAccount(tx)?.currency ?? tx?.currency ?? tx?.account_currency,
                                    )
                                    : "-"
                            }}
                        </td>

                        <td class="px-6 py-4 ">{{ formatDate(tx?.add_date ?? tx?.date) }}</td>
                    </tr>

                    <tr v-if="transactions.length === 0">
                        <td colspan="6" class="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                            暂无记录
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
