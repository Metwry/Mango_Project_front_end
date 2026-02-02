<script setup>
import { reactive, watch, ref } from "vue"; // 1. 引入 ref
import DatePicker from "@/components/ui/DatePicker.vue";
import AccountPicker from "@/components/ui/AccountPicker.vue";
import dayjs from "dayjs";

const props = defineProps({
    accounts: { type: Array, default: () => [] },
    accountsLoading: { type: Boolean, default: false },
    accountsError: { type: [Boolean, Object, String, null], default: null },
    submitting: { type: Boolean, default: false },
    resetKey: { type: [Number, String], default: 0 },
});

const emit = defineEmits(["submit"]);

// 2. 新增标记：记录用户是否手动修改过日期
const isDateManuallyModified = ref(false);

const form = reactive({
    account_id: null,
    counterparty: "",
    category_name: "",
    amount: null,
    // 初始化为当前时间（用于显示）
    add_date: dayjs().format("YYYY-MM-DD HH:mm:ss.SSS Z"),
});

// 3. 新增：专门处理日期变更的函数
// 在 Template 中，DatePicker 需要绑定 @update:model-value="onDateChange"
function onDateChange(val) {
    form.add_date = val;
    // 一旦触发这个函数，说明是用户手动选的，标记为 true
    isDateManuallyModified.value = true;
}

function clear() {
    form.account_id = null;
    form.counterparty = "";
    form.category_name = "";
    form.amount = null;
    // 重置为当前最新时间
    form.add_date = dayjs().format("YYYY-MM-DD HH:mm:ss.SSS Z");
    // 4. 重置时，记得把“手动修改标记”也归位
    isDateManuallyModified.value = false;
}

function submit() {
    // 5. 核心逻辑：提交前检查
    // 如果用户从来没碰过日期组件 (!isDateManuallyModified)，
    // 说明他想用“现在”的时间。此时 form.add_date 可能是 5 分钟前的旧数据，
    // 所以我们在这里强制刷新成“这一刻”的时间。
    let finalDate = form.add_date;

    if (!isDateManuallyModified.value) {
        finalDate = dayjs().format("YYYY-MM-DD HH:mm:ss.SSS Z");
    }

    emit("submit", {
        account: form.account_id,
        counterparty: form.counterparty,
        category_name: form.category_name,
        amount: form.amount,
        add_date: finalDate, // 使用处理过的时间
    });
}

watch(
    () => props.resetKey,
    () => clear(),
);
</script>

<template>
    <div
        class="h-full w-full bg-white dark:bg-gray-800 rounded-2xl dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
        <div class="px-6 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 class="font-bold text-gray-700 dark:text-gray-200">添加交易</h3>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <AccountPicker v-model="form.account_id" :accounts="accounts" :loading="accountsLoading"
                    :error="accountsError" label="账户" />

                <div class="md:col-span-1">
                    <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">交易方</label>
                    <input v-model="form.counterparty" type="text"
                        class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600" />
                </div>

                <div class="md:col-span-1">
                    <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">分类</label>
                    <input v-model="form.category_name" type="text" placeholder="例如：餐饮 / 工资 / 转账"
                        class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600" />
                </div>

                <div class="md:col-span-1">
                    <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">金额</label>
                    <input v-model="form.amount" type="number" inputmode="decimal" placeholder="0.00"
                        class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600" />
                </div>
            </div>

            <div>
                <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">日期</label>
                <DatePicker :model-value="form.add_date" @update:model-value="onDateChange" />
            </div>
        </div>

        <div class="px-6 py-6 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
            <button type="button"
                class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors text-gray-500 hover:text-red-600 hover:bg-red-50 cursor-pointer dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20"
                :disabled="submitting" @click="clear">
                重置
            </button>

            <button type="button"
                class="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white rounded-lg transition-all shadow-md shadow-green-500/30 bg-gradient-to-r from-green-500 to-green-600 cursor-pointer hover:from-green-600 hover:to-green-700 hover:shadow-lg hover:shadow-green-500/40 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:from-gray-400 disabled:to-gray-500"
                :disabled="submitting || !form.account_id || !form.amount" @click="submit">
                确认保存
            </button>
        </div>
    </div>
</template>
