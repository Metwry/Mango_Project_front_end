<script setup>
import { ref, watch } from 'vue'
import BaseIcon from '../BaseIcon.vue'
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
    <Transition name="modal">
        <div v-if="isOpen"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-hidden">

            <div
                class="w-full max-w-2xl max-h-[85vh] overflow-auto rounded-3xl bg-white p-6 md:p-8 dark:bg-gray-800 shadow-2xl">
                <div class="relative mb-8">
                    <h2 class="text-center text-2xl font-bold text-gray-900 dark:text-white">
                        添加账户
                    </h2>

                    <button @click="emit('close')"
                        class="absolute right-0 top-1 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <BaseIcon name="closeIcon" class="h-5 w-5 cursor-pointer" />
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">账户名称:</label>
                        <input v-model="account.name" type="text" class="input-style w-full"
                            placeholder="例如：招商银行 / 现金" />
                    </div>

                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">账户类型:</label>
                        <input v-model="account.type" type="text" class="input-style w-full" placeholder="例如：储蓄卡、基金" />
                    </div>

                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">初始金额:</label>
                        <input v-model.number="account.balance" type="number" class="input-style w-full"
                            placeholder="0.00" />
                    </div>

                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">币种:</label>
                        <select v-model="account.currency" class="select-style w-full">
                            <option value="CNY">人民币(CNY)</option>
                            <option value="USD">美元(USD)</option>
                            <option value="EUR">欧元 (EUR)</option>
                        </select>
                    </div>
                </div>

                <div class="mt-10 flex justify-end gap-3">
                    <button @click="AddAccount"
                        class="button-base px-8 py-2.5 transform active:scale-95 transition-transform"
                        :disabled="accountsStore.saving">
                        {{ accountsStore.saving ? '提交中...' : '确认添加' }}
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped src="@/styles/modal.css"></style>
