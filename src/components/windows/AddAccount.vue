<script setup>
import { computed, ref, watch } from 'vue'
import { onClickOutside } from "@vueuse/core";
import { ElMessage } from "element-plus";
import BaseIcon from '../ui/BaseIcon.vue'
import { useAccountsStore } from '@/stores/accounts'

const emit = defineEmits(['close'])
const accountsStore = useAccountsStore()

const props = defineProps({
    isOpen: Boolean
})

const account = ref({
    name: '',
    currency: null,
    balance: null,
    type: ''
})
const currencyOpen = ref(false);
const currencyWrapRef = ref(null);
const advancedMode = ref(false);

const currencyOptions = [
    { value: "CNY", label: "人民币 (CNY)" },
    { value: "USD", label: "美元 (USD)" },
    { value: "EUR", label: "欧元 (EUR)" },
    { value: "HKD", label: "港币 (HKD)" },
    { value: "JPY", label: "日元 (JPY)" },
];

const selectedCurrencyLabel = computed(() => {
    return currencyOptions.find((item) => item.value === account.value.currency)?.label ?? "请选择币种";
});

function pickCurrency(value) {
    account.value.currency = value;
    currencyOpen.value = false;
}

function onAdvancedChange() {
    advancedMode.value = false;
    ElMessage.info("该功能正在开发");
}

//添加账户
async function AddAccount() {
    await accountsStore.createAccount(account.value)
    emit('close')
}


// 如果窗口变成打开状态，则重置数据
watch(() => props.isOpen, (newVal) => {

    if (newVal) {
        account.value = {
            name: '',
            currency: "CNY",
            balance: null,
            type: ''
        }
        currencyOpen.value = false;
        advancedMode.value = false;
    }
})

onClickOutside(currencyWrapRef, () => {
    currencyOpen.value = false;
});

</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
        <div v-if="isOpen" class="fixed items-center justify-center inset-0 z-50 flex bg-black/50 backdrop-blur-sm">
            <div class="modal-content w-full max-w-xl rounded-4xl bg-white p-6  dark:bg-gray-800">
                <div class="mb-10 grid grid-cols-[1fr_auto_1fr]">
                    <div></div>
                    <div class="flex items-center justify-center gap-2">
                        <div class="text-center text-2xl font-bold text-gray-900 dark:text-white">添加账户</div>
                        <label
                            class="surface-chip inline-flex h-6 cursor-pointer select-none items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100 px-2 text-[11px] font-semibold text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                            <input v-model="advancedMode" type="checkbox"
                                class="h-3.5 w-3.5 rounded border-gray-300 text-gray-500 dark:text-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0 dark:border-gray-500 dark:bg-gray-800"
                                @change="onAdvancedChange" />
                            <span>高级</span>
                        </label>
                    </div>
                    <div class="flex justify-end">
                        <button @click="emit('close')" class="p-2 button-base">
                            <BaseIcon name="closeIcon" class="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-5 ">
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 ">账户名称:</label>
                        <input v-model="account.name" class="input-base w-full" placeholder="例如：招商银行 / 现金" />
                    </div>

                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 ">账户类型:</label>
                        <input v-model="account.type" class="input-base w-full" placeholder="例如: Cash、Stock" />
                    </div>

                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 ">初始金额:</label>
                        <input @keydown.enter="AddAccount" v-model.number="account.balance" type="number"
                            class="input-base w-full" placeholder="0.00" />
                    </div>

                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 ">币种:</label>
                        <div ref="currencyWrapRef" class="relative">
                            <button type="button"
                                class="dropdown-trigger"
                                @click="currencyOpen = !currencyOpen">
                                <span class="text-sm text-gray-700 dark:text-gray-200">{{ selectedCurrencyLabel }}</span>
                                <BaseIcon name="arrow" :size="14"
                                    :class="['dropdown-arrow', currencyOpen && 'rotate-180']" />
                            </button>

                            <Transition name="dropdown-drawer">
                                <div v-if="currencyOpen"
                                    class="dropdown-panel absolute left-0 top-[calc(100%+8px)] w-full">
                                    <div class="dropdown-list">
                                    <button v-for="item in currencyOptions" :key="item.value" type="button" :class="[
                                        'dropdown-item',
                                        account.currency === item.value
                                            ? 'dropdown-item-active'
                                            : 'dropdown-item-idle'
                                    ]" @click="pickCurrency(item.value)">
                                        {{ item.label }}
                                    </button>
                                    </div>
                                </div>
                            </Transition>
                        </div>
                    </div>
                </div>

                <div class="mt-10 flex justify-end">
                    <button @click="AddAccount" class="button-base" :disabled="accountsStore.saving">
                        {{ accountsStore.saving ? '提交中...' : '确认添加' }}
                    </button>
                </div>
            </div>
        </div>
        </Transition>
    </Teleport>
</template>

<style scoped src="@/styles/modal.css"></style>
