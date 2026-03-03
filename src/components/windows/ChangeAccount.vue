<script setup>
import { computed, ref, watch } from 'vue'
import { onClickOutside } from "@vueuse/core";
import BaseIcon from '../ui/BaseIcon.vue'
import { useAccountsStore } from '@/stores/accounts'
import { ElMessage, ElMessageBox } from "element-plus";


const emit = defineEmits(['close'])
const props = defineProps({
    isOpen: Boolean,
    data: {
        type: Object,
        default: () => ({})
    }
})

const accountsStore = useAccountsStore()

const account = ref({
    id: null,
    name: '',
    currency: 'CNY',
    balance: null,
    type: ''
})
const currencyOpen = ref(false);
const currencyWrapRef = ref(null);

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

watch(
    () => props.isOpen,
    (newVal) => {
        if (newVal && props.data) {
            account.value = {
                id: props.data.id,
                name: props.data.name,
                currency: props.data.currency || 'CNY',
                balance: props.data.balance ?? null,
                type: props.data.type
            }
            currencyOpen.value = false;
        }
    },
    { immediate: true }
)

const UpdateAccount = async () => {
    try {
        if (!account.value.id) return
        await accountsStore.updateAccount(account.value.id, account.value)
        emit('close')
    } catch {}
}

const DeleteAccount = async () => {
    const id = account.value.id
    if (!id) return
    try {
        await ElMessageBox.confirm('确定删除？删除后无法恢复。')
        await accountsStore.deleteAccount(id)
        emit('close')
        ElMessage.success("删除成功")
    } catch (e) {
        if (e === 'cancel' || e === 'close') return
    }
}

onClickOutside(currencyWrapRef, () => {
    currencyOpen.value = false;
});
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
        <div v-if="isOpen" class="fixed items-center justify-center inset-0 z-50 flex bg-black/50 backdrop-blur-sm">
            <div class="modal-content w-full max-w-xl rounded-4xl bg-white p-6 dark:bg-gray-800">
                <div class="mb-10 grid grid-cols-[1fr_auto_1fr] items-center">
                    <div></div>

                    <div class="text-center text-2xl font-bold text-gray-900 dark:text-white">
                        修改账户
                    </div>

                    <div class="flex justify-end">
                        <button @click="emit('close')" class="p-2 button-base">
                            <BaseIcon name="closeIcon" class="h-5 w-5" />
                        </button>
                    </div>
                </div>


                <div class="grid grid-cols-2 gap-5">
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">账户名称:</label>
                        <input v-model="account.name" type="text" class="input-base w-full" placeholder="例如：招商银行" />
                    </div>

                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">账户类型:</label>
                        <input v-model="account.type" type="text" class="input-base w-full" placeholder="例如：储蓄卡、基金" />
                    </div>

                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">当前余额:</label>
                        <input v-model.number="account.balance" type="number" class="input-base w-full"
                            placeholder="0.00" />
                    </div>

                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">币种:</label>
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

                <div class="mt-10 flex items-center justify-between">
                    <button @click="DeleteAccount" class="button-base bg-red-500 hover:bg-red-600"
                        :disabled="accountsStore.saving">
                        删除账户
                    </button>

                    <button @click="UpdateAccount" class="button-base" :disabled="accountsStore.saving">
                        {{ accountsStore.saving ? '保存中...' : '保存修改' }}
                    </button>
                </div>
            </div>
        </div>
        </Transition>
    </Teleport>
</template>


<style scoped src="@/styles/modal.css"></style>
