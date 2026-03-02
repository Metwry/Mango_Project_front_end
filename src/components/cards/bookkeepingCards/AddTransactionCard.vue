<script setup>
import { reactive, watch, ref, computed } from "vue";
import DatePicker from "@/components/ui/DatePicker.vue";
import AccountPicker from "@/components/ui/AccountPicker.vue";
import dayjs from "dayjs";
import { ElMessage } from "element-plus";
import { filterNonInvestmentAccounts } from "@/utils/accountFilters";

const props = defineProps({
    accounts: { type: Array, default: () => [] },
    accountsLoading: { type: Boolean, default: false },
    accountsError: { type: [Boolean, Object, String, null], default: null },
    submitting: { type: Boolean, default: false },
    resetKey: { type: [Number, String], default: 0 },
});

const emit = defineEmits(["submit"]);

const now = () => dayjs().format("YYYY-MM-DD HH:mm:ss.SSS Z");

const isDateManuallyModified = ref(false);

const form = reactive({
    account_id: null,
    counterparty: "",
    category_name: "",
    amount: null,
    add_date: now(),
});
const advancedMode = ref(false);
const selectableAccounts = computed(() => filterNonInvestmentAccounts(props.accounts));

const canSubmit = computed(() => !props.submitting && form.account_id && form.amount);

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
        add_date: now(),
    });
    advancedMode.value = false;
    isDateManuallyModified.value = false;
}

function submit() {
    if (!canSubmit.value) return;

    emit("submit", {
        ...form,
        account: form.account_id,
        add_date: isDateManuallyModified.value ? form.add_date : now(),
    });
}

function onAdvancedChange() {
    ElMessage.info("该功能正在开发");
}

watch(() => props.resetKey, clear);
</script>

<template>
    <div class="card-base">
        <div class="flex-1 px-1 overflow-y-auto space-y-6">
            <div class="card-title !justify-start gap-2">
                <h3>添加交易</h3>
                <label
                    class="inline-flex h-6 cursor-pointer select-none items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100 px-2 text-[11px] font-semibold text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                    <input v-model="advancedMode" type="checkbox"
                        class="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:outline-none focus:ring-0 focus:ring-offset-0 dark:border-gray-500 dark:bg-gray-800"
                        @change="onAdvancedChange" />
                    <span>高级</span>
                </label>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <AccountPicker v-model="form.account_id" :accounts="selectableAccounts" :loading="accountsLoading"
                    :error="accountsError" />
                <div class="md:col-span-1">
                    <input v-model="form.counterparty" type="text" placeholder="输入交易方" class=" input-base" />
                </div>
                <div class="md:col-span-1">
                    <input v-model="form.category_name" type="text" placeholder="输入类型" class="input-base" />
                </div>
                <div class="md:col-span-1">
                    <input v-model="form.amount" type="number" inputmode="decimal" placeholder="输入金额" class="input-base"
                        @keydown.enter="submit" />
                </div>
            </div>

            <div>
                <DatePicker :model-value="form.add_date" @update:model-value="onDateChange" />
            </div>
        </div>

        <div class="px-5 py-1 flex justify-end gap-5">
            <button class="button-base gap-2  disabled:opacity-60 !bg-transparent  " :disabled="submitting"
                @click="clear">
                重置
            </button>

            <button class="button-base ring-0 gap-2 text-white bg-green-600  hover:bg-green-700 disabled:opacity-60 "
                :disabled="!canSubmit" @click="submit">
                确认保存
            </button>
        </div>
    </div>
</template>
