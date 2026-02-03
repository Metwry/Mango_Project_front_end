<script setup>
import { ref, watch } from 'vue'
import BaseIcon from '../BaseIcon.vue'
import { createAccount } from '@/utils/accounts.js'
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

//添加账户
async function AddAccount() {
    try {
        await accountsStore.createAccount(account.value)  // ✅ 调用 store（内部会强制刷新）
        emit('close')
    } catch (e) {
        console.error(e)
    }
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
    }
})

</script>

<template>

    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div class="w-full max-w-2xl max-h-[85vh] overflow-auto rounded-2xl bg-white p-5 md:p-8 dark:bg-gray-800">
            <div class="relative mb-10">
                <h2 class="text-center text-2xl font-bold text-gray-900 dark:text-white">
                    添加账户
                </h2>

                <button @click="emit('close')"
                    class="absolute right-0 top-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    <BaseIcon name="closeIcon" class="h-6 w-6 cursor-pointer" />
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 md:gap-y-10">
                <div class="field-row">
                    <label class="label-text">账户:</label>
                    <input v-model="account.name" type="text" class="input-style w-full"
                        placeholder="例如：银行卡 / 现金 / 证券账户" />
                </div>

                <div class="field-row">
                    <label class="label-text">类型:</label>
                    <input v-model="account.type" type="text" class="input-style w-full" />
                </div>

                <div class="field-row">
                    <label class="label-text">金额:</label>
                    <input v-model.number="account.balance" type="number" class="input-style w-full"
                        placeholder="0.00" />
                </div>

                <div class="field-row">
                    <label class="label-text">币种:</label>
                    <select v-model="account.currency" class="select-style w-full">
                        <option value="CNY">人民币(CNY)</option>
                        <option value="USD">美元(USD)</option>
                        <option value="EUR">欧元 (EUR)</option>
                    </select>
                </div>
            </div>

            <div class="mt-8 flex justify-end">
                <button @click="AddAccount" class="ui-btn-primary" :disabled="accountsStore.saving">
                    完成
                </button>
            </div>
        </div>
    </div>


</template>