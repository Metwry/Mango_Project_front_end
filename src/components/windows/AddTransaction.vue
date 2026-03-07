<script setup>
import { computed, reactive, ref, watch } from "vue";
import dayjs from "dayjs";
import { ElMessage } from "element-plus";
import BaseIcon from "@/components/ui/BaseIcon.vue";
import DatePicker from "@/components/ui/DatePicker.vue";
import AccountPicker from "@/components/ui/AccountPicker.vue";
import { filterNonInvestmentAccounts } from "@/utils/accounts";

const props = defineProps({
    isOpen: { type: Boolean, default: false },
    accounts: { type: Array, default: () => [] },
    accountsLoading: { type: Boolean, default: false },
    accountsError: { type: [Boolean, Object, String, null], default: null },
    submitting: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "submit"]);

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

function resetForm() {
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

function closeModal() {
    emit("close");
}

function onAdvancedChange() {
    ElMessage.info("该功能正在开发");
}

function submit() {
    if (!canSubmit.value) return;

    emit("submit", {
        ...form,
        account: form.account_id,
        add_date: isDateManuallyModified.value ? form.add_date : now(),
    });
}

watch(
    () => props.isOpen,
    (opened) => {
        if (opened) resetForm();
    },
);
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="isOpen"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-4">
                <div class="modal-content w-full max-w-xl rounded-4xl bg-white p-4 dark:bg-gray-800 sm:p-6">
                    <div class="mb-6 grid grid-cols-[1fr_auto_1fr] items-center sm:mb-8">
                        <div></div>
                        <div class="flex items-center justify-center gap-2">
                            <div class="text-center text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">记账
                            </div>
                            <label
                                class="surface-chip inline-flex h-6 cursor-pointer select-none items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100 px-2 text-[11px] font-semibold text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                                <input v-model="advancedMode" type="checkbox"
                                    class="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:outline-none focus:ring-0 focus:ring-offset-0 dark:border-gray-500 dark:bg-gray-800"
                                    @change="onAdvancedChange" />
                                <span>高级</span>
                            </label>
                        </div>
                        <div class="flex justify-end">
                            <button @click="closeModal" class="button-base p-2">
                                <BaseIcon name="closeIcon" class="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">选择账户:</label>
                            <AccountPicker v-model="form.account_id" :accounts="selectableAccounts"
                                :loading="accountsLoading" :error="accountsError" />
                        </div>

                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">交易方:</label>
                            <input v-model="form.counterparty" type="text" placeholder="输入交易方"
                                class="input-base w-full" />
                        </div>

                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">交易类型:</label>
                            <input v-model="form.category_name" type="text" placeholder="输入类型"
                                class="input-base w-full" />
                        </div>

                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">金额:</label>
                            <input v-model="form.amount" type="number" inputmode="decimal" placeholder="输入金额"
                                class="input-base w-full" @keydown.enter="submit" />
                        </div>

                        <div class="space-y-2 md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">交易时间:</label>
                            <DatePicker :model-value="form.add_date" @update:model-value="onDateChange" />
                        </div>
                    </div>

                    <div class="mt-8 flex items-center justify-end gap-3">
                        <button class="button-base !bg-transparent" :disabled="submitting" @click="resetForm">
                            重置
                        </button>
                        <button
                            class="preserve-dark-white button-base !bg-green-600 !text-white hover:!bg-green-700 disabled:opacity-60"
                            :disabled="!canSubmit" @click="submit">
                            {{ submitting ? "提交中..." : "确认保存" }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped src="@/styles/modal.css"></style>
