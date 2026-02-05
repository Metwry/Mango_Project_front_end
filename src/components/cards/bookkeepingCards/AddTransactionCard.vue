<script setup>
import { reactive, watch, ref, computed } from "vue";
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

const now = () => dayjs().format("YYYY-MM-DD HH:mm:ss.SSS Z");

const isDateManuallyModified = ref(false);

const form = reactive({
    account_id: null,
    counterparty: "",
    category_name: "",
    amount: null,
    add_date: now(),
});

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

watch(() => props.resetKey, clear);
</script>

<template>
    <div class="card-base">
        <div class="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
            <h3 class="card-title">添加交易</h3>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <AccountPicker v-model="form.account_id" :accounts="accounts" :loading="accountsLoading"
                    :error="accountsError" />

                <div class="md:col-span-1">
                    <input v-model="form.counterparty" type="text" placeholder="输入交易方..." class=" input-base" />
                </div>

                <div class="md:col-span-1">
                    <input v-model="form.category_name" type="text" placeholder="输入分类..." class="input-base" />
                </div>

                <div class="md:col-span-1">
                    <input v-model="form.amount" type="number" inputmode="decimal" placeholder="0.00"
                        class="input-base" />
                </div>
            </div>

            <div>
                <DatePicker :model-value="form.add_date" @update:model-value="onDateChange" />
            </div>
        </div>

        <div class="px-5 py-1 flex justify-end gap-5">
            <button type="button" class="button-base gap-2  disabled:opacity-60 !bg-transparent  "
                :disabled="submitting" @click="clear">
                重置
            </button>

            <button type="button"
                class="button-base gap-2 text-white bg-green-600  hover:bg-green-700 disabled:opacity-60 "
                :disabled="!canSubmit" @click="submit">
                确认保存
            </button>
        </div>
    </div>
</template>
