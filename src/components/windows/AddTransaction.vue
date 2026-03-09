<script setup>
import { computed, reactive, ref, watch } from "vue";
import { onClickOutside } from "@vueuse/core";
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

const TRANSACTION_DIRECTION = Object.freeze({
    INCOME: "income",
    EXPENSE: "expense",
});

const transactionDirectionOptions = [
    { value: TRANSACTION_DIRECTION.INCOME, label: "收入" },
    { value: TRANSACTION_DIRECTION.EXPENSE, label: "支出" },
];

const now = () => dayjs().format("YYYY-MM-DD HH:mm:ss.SSS Z");
const isDateManuallyModified = ref(false);
const transactionDirection = ref(TRANSACTION_DIRECTION.INCOME);
const transactionDirectionOpen = ref(false);
const transactionDirectionWrapRef = ref(null);

const form = reactive({
    account_id: null,
    counterparty: "",
    category_name: "",
    amount: null,
    add_date: now(),
});
const advancedMode = ref(false);
const selectableAccounts = computed(() => filterNonInvestmentAccounts(props.accounts));

const normalizedAmount = computed(() => {
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const safeAmount = Math.abs(amount);
    return transactionDirection.value === TRANSACTION_DIRECTION.EXPENSE
        ? -safeAmount
        : safeAmount;
});
const normalizedRemark = computed(() => {
    const text = String(form.category_name ?? "").trim();
    return text || "无";
});
const currentTransactionDirectionLabel = computed(() => {
    return transactionDirectionOptions.find((item) => item.value === transactionDirection.value)?.label ?? "收入";
});

const canSubmit = computed(() => !props.submitting && form.account_id && normalizedAmount.value !== null);

function onDateChange(val) {
    form.add_date = val;
    isDateManuallyModified.value = true;
}

function onAmountInput() {
    if (form.amount === null || form.amount === undefined || form.amount === "") return;

    const amount = Number(form.amount);
    if (!Number.isFinite(amount)) return;
    if (amount < 0) {
        form.amount = Math.abs(amount);
    }
}

function toggleTransactionDirectionOpen() {
    transactionDirectionOpen.value = !transactionDirectionOpen.value;
}

function pickTransactionDirection(value) {
    transactionDirection.value = value;
    transactionDirectionOpen.value = false;
}

function resetForm() {
    Object.assign(form, {
        account_id: null,
        counterparty: "",
        category_name: "",
        amount: null,
        add_date: now(),
    });
    transactionDirection.value = TRANSACTION_DIRECTION.INCOME;
    transactionDirectionOpen.value = false;
    advancedMode.value = false;
    isDateManuallyModified.value = false;
}

function closeModal() {
    transactionDirectionOpen.value = false;
    emit("close");
}

function onAdvancedChange() {
    ElMessage.info("该功能正在开发");
}

function submit() {
    if (!canSubmit.value) return;

    emit("submit", {
        account_id: form.account_id,
        counterparty: form.counterparty,
        category_name: normalizedRemark.value,
        amount: normalizedAmount.value,
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

onClickOutside(transactionDirectionWrapRef, () => {
    transactionDirectionOpen.value = false;
});
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
                                    class="h-3.5 w-3.5 rounded border-gray-300 text-gray-500 dark:text-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0 dark:border-gray-500 dark:bg-gray-800"
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
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">收支类型:</label>
                            <div ref="transactionDirectionWrapRef" class="relative">
                                <button type="button" class="dropdown-trigger !h-10"
                                    @click="toggleTransactionDirectionOpen">
                                    <span class="truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                                        {{ currentTransactionDirectionLabel }}
                                    </span>
                                    <BaseIcon name="arrow" :size="14"
                                        :class="['dropdown-arrow', transactionDirectionOpen && 'rotate-180']" />
                                </button>

                                <Transition name="dropdown-drawer">
                                    <div v-if="transactionDirectionOpen"
                                        class="dropdown-panel absolute left-0 top-[calc(100%+8px)] w-full">
                                        <div class="dropdown-list !max-h-56">
                                            <button v-for="option in transactionDirectionOptions" :key="option.value"
                                                type="button" class="dropdown-item" :class="transactionDirection === option.value
                                                    ? 'dropdown-item-active'
                                                    : 'dropdown-item-idle'"
                                                @click="pickTransactionDirection(option.value)">
                                                {{ option.label }}
                                            </button>
                                        </div>
                                    </div>
                                </Transition>
                            </div>
                        </div>

                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">交易方:</label>
                            <input v-model="form.counterparty" type="text" placeholder="输入交易方"
                                class="input-base w-full" />
                        </div>

                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">金额:</label>
                            <input v-model.number="form.amount" type="number" inputmode="decimal" min="0" step="any"
                                placeholder="输入金额" class="input-base w-full" @input="onAmountInput"
                                @keydown.enter="submit" />
                        </div>

                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">备注:</label>
                            <input v-model="form.category_name" type="text" placeholder="输入备注"
                                class="input-base w-full" />
                        </div>

                        <div class="space-y-2">
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
