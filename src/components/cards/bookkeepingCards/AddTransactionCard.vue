<script setup>
import { onMounted, reactive } from "vue";
import { storeToRefs } from "pinia";
import DatePicker from "@/components/ui/DatePicker.vue";
import AccountPicker from "@/components/ui/AccountPicker.vue";
import { useAccountsStore } from "@/stores/accounts";
import { useTransactionsStore } from "@/stores/transaction";

const accountsStore = useAccountsStore();
const { accounts, loading, error } = storeToRefs(accountsStore);
const transactionsStore = useTransactionsStore();

onMounted(() => {
    accountsStore.fetchAccounts();
});

const form = reactive({
    account_id: null,
    counterparty: "",
    category_name: "",
    amount: null,
    add_date: new Date().toISOString()
});


function clear() {

    form.account_id = null;
    form.counterparty = '';
    form.category_name = '';
    form.amount = null;
    form.add_date = new Date().toISOString();
};

function addTransaction() {
    return transactionsStore.createOne({
        account: form.account_id,
        counterparty: form.counterparty,
        category_name: form.category_name,
        amount: form.amount,
        add_date: form.add_date,
        type: form.type,
    });
}
</script>

<template>
    <div
        class="h-full w-full bg-white dark:bg-gray-800 rounded-2xl dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
        <!-- 头部：固定 -->
        <div class="px-6 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 class="font-bold text-gray-700 dark:text-gray-200">添加交易</h3>
        </div>

        <!-- 中间：表单区（可滚动） -->
        <div class="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
            <!-- ✅ 账户 / 类型 / 金额：同一行 -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <!-- ✅ 抽离后的账户选择 -->
                <AccountPicker v-model="form.account_id" :accounts="accounts" :loading="loading" :error="error"
                    label="账户" />

                <!-- 交易方 -->
                <div class="md:col-span-1">
                    <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">交易方</label>
                    <input v-model="form.counterparty" type="text" class="w-full rounded-lg border border-gray-200 dark:border-gray-700
                   bg-white dark:bg-gray-800 px-3 py-2 text-sm
                   text-gray-700 dark:text-gray-200 outline-none
                   focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600" />
                </div>


                <!-- 类型 -->
                <div class="md:col-span-1">
                    <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">类型</label>
                    <input v-model="form.category_name" type="text" placeholder="例如：餐饮 / 工资 / 转账" class="w-full rounded-lg border border-gray-200 dark:border-gray-700
                   bg-white dark:bg-gray-800 px-3 py-2 text-sm
                   text-gray-700 dark:text-gray-200 outline-none
                   focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600" />
                </div>



                <!-- 金额 -->
                <div class="md:col-span-1">
                    <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">金额</label>
                    <input type="number" v-model="form.amount" inputmode="decimal" placeholder="0.00" class="w-full rounded-lg border border-gray-200 dark:border-gray-700
                   bg-white dark:bg-gray-800 px-3 py-2 text-sm
                   text-gray-700 dark:text-gray-200 outline-none
                   focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600" />
                </div>
            </div>

            <!-- 日期 -->
            <div>
                <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">日期</label>
                <DatePicker v-model="form.add_date" />
            </div>
        </div>

        <!-- 底部：固定操作区 -->
        <div class="px-6 py-6  flex items-center justify-end gap-3">
            <button type="button" class=" cursor-pointer px-4 py-2 rounded-lg text-sm ring-1 ring-gray-200 dark:ring-gray-600
               hover:bg-gray-50 dark:hover:bg-gray-700" @click="clear">
                清空
            </button>

            <button type="button" class=" cursor-pointer px-4 py-2 rounded-lg text-sm bg-gray-900 text-white hover:bg-gray-800
               disabled:opacity-60" :disabled="!form.account_id || !form.amount" @click="addTransaction">
                保存
            </button>
        </div>
    </div>
</template>
