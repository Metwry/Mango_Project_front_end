<script setup>
import { reactive, watch, ref, computed } from "vue"; // 删掉 onMounted
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

// 获取当前格式化时间的快捷方法
const getNow = () => dayjs().format("YYYY-MM-DD HH:mm:ss.SSS Z");

const isDateManuallyModified = ref(false);

const form = reactive({
    account_id: null,
    counterparty: "",
    category_name: "",
    amount: null,
    add_date: getNow(),
});

// 计算属性：逻辑收口，方便后续增加校验条件（如金额必须大于0）
const canSubmit = computed(() => {
    return !props.submitting && form.account_id && form.amount;
});

function onDateChange(val) {
    form.add_date = val;
    isDateManuallyModified.value = true;
}

function clear() {
    Object.assign(form, {
        account_id: null,
        counterparty: "",
        category_name: "",
        amount: null,
        add_date: getNow(),
    });
    isDateManuallyModified.value = false;
}

function submit() {
    if (!canSubmit.value) return;

    emit("submit", {
        ...form,
        account: form.account_id,
        add_date: isDateManuallyModified.value ? form.add_date : getNow(),
    });
}

watch(() => props.resetKey, clear);
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
                    <label class="label-text">交易方</label>
                    <input v-model="form.counterparty" type="text"
                        class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600" />
                </div>

                <div class="md:col-span-1">
                    <label class="label-text">分类</label>
                    <input v-model="form.category_name" type="text" placeholder="例如：餐饮 / 工资 / 转账"
                        class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600" />
                </div>

                <div class="md:col-span-1">
                    <label class="label-text">金额</label>
                    <input v-model="form.amount" type="number" inputmode="decimal" placeholder="0.00"
                        class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600" />
                </div>
            </div>

            <div>
                <label class="label-text">日期</label>
                <DatePicker :model-value="form.add_date" @update:model-value="onDateChange" />
            </div>
        </div>

        <div class="px-5 py-2 flex justify-end gap-5">
            <button type="button" class="button-base gap-2  !bg-transparent text-gray-500 " :disabled="submitting"
                @click="clear">
                重置
            </button>

            <button type="button" class="button-base gap-2  rounded-lg 
           bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 " :disabled="!canSubmit" @click="submit">
                确认保存
            </button>
        </div>
    </div>
</template>
