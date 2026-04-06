<script setup>
import { computed, reactive, watch } from "vue";
import BaseIcon from "@/components/ui/BaseIcon.vue";
import AccountPicker from "@/components/ui/AccountPicker.vue";
import { filterNonInvestmentAccounts } from "@/utils/accounts";

const props = defineProps({
    isOpen: { type: Boolean, default: false },
    accounts: { type: Array, default: () => [] },
    submitting: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "submit"]);

const form = reactive({
    fromAccountId: null,
    toAccountId: null,
    amount: null,
    remark: "账户转账",
});

function isAccountActive(account) {
    if (account?.is_active === false) return false;
    const status = String(account?.status ?? "").trim().toLowerCase();
    if (!status) return true;
    return status === "active" || status === "enabled" || status === "1";
}

const selectableAccounts = computed(() => {
    const list = filterNonInvestmentAccounts(props.accounts);
    return list.filter(isAccountActive);
});

const fromAccount = computed(() => {
    return selectableAccounts.value.find((item) => String(item?.id) === String(form.fromAccountId)) ?? null;
});

const toAccount = computed(() => {
    return selectableAccounts.value.find((item) => String(item?.id) === String(form.toAccountId)) ?? null;
});

const currencyMatched = computed(() => {
    if (!fromAccount.value || !toAccount.value) return true;
    return String(fromAccount.value.currency || "").toUpperCase() === String(toAccount.value.currency || "").toUpperCase();
});

const normalizedAmount = computed(() => {
    const n = Number(form.amount);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.abs(n);
});

const canSubmit = computed(() => {
    return (
        !props.submitting &&
        form.fromAccountId &&
        form.toAccountId &&
        String(form.fromAccountId) !== String(form.toAccountId) &&
        normalizedAmount.value !== null &&
        currencyMatched.value
    );
});

function onAmountInput() {
    if (form.amount === null || form.amount === undefined || form.amount === "") return;
    const n = Number(form.amount);
    if (!Number.isFinite(n)) return;
    if (n < 0) form.amount = Math.abs(n);
}

function resetForm() {
    form.fromAccountId = null;
    form.toAccountId = null;
    form.amount = null;
    form.remark = "账户转账";
}

function closeModal() {
    emit("close");
}

function submit() {
    if (!canSubmit.value) return;

    emit("submit", {
        account: Number(form.fromAccountId),
        transfer_account: Number(form.toAccountId),
        amount: String(normalizedAmount.value),
        remark: String(form.remark ?? "").trim() || "账户转账",
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
                        <div class="text-center text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                            账户转账
                        </div>
                        <div class="flex justify-end">
                            <button @click="closeModal" class="button-base p-2">
                                <BaseIcon name="closeIcon" class="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">转出账户:</label>
                            <AccountPicker v-model="form.fromAccountId" :accounts="selectableAccounts" />
                        </div>

                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">转入账户:</label>
                            <AccountPicker v-model="form.toAccountId" :accounts="selectableAccounts" />
                        </div>

                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">转账金额:</label>
                            <input v-model.number="form.amount" type="number" inputmode="decimal" min="0" step="any"
                                placeholder="输入转账金额" class="input-base w-full" @input="onAmountInput"
                                @keydown.enter="submit" />
                        </div>

                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">备注:</label>
                            <input v-model="form.remark" type="text" placeholder="输入备注（可选）" class="input-base w-full" />
                        </div>
                    </div>

                    <p v-if="form.fromAccountId && form.toAccountId && String(form.fromAccountId) === String(form.toAccountId)"
                        class="mt-3 text-xs text-red-500">
                        转出账户和转入账户不能相同。
                    </p>
                    <p v-else-if="!currencyMatched" class="mt-3 text-xs text-red-500">
                        转出账户和转入账户币种必须一致。
                    </p>

                    <div class="mt-8 flex items-center justify-end gap-3">
                        <button class="button-base !bg-transparent" :disabled="submitting" @click="resetForm">
                            重置
                        </button>
                        <button
                            class="preserve-dark-white button-base !bg-green-600 !text-white hover:!bg-green-700 disabled:opacity-60"
                            :disabled="!canSubmit" @click="submit">
                            {{ submitting ? "提交中..." : "确认转账" }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped src="@/styles/modal.css"></style>
