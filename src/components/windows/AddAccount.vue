<script setup>
import { ref, watch } from 'vue'
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
    }
})

</script>

<template>
    <Transition name="modal">
        <div v-if="isOpen" class="fixed items-center justify-center inset-0 z-50 flex bg-black/50 backdrop-blur-sm">
            <div class="w-full max-w-xl rounded-4xl bg-white p-6  dark:bg-gray-800">
                <div class="mb-10 grid grid-cols-[1fr_auto_1fr]">
                    <div></div>
                    <div class="text-center text-2xl font-bold text-gray-900 dark:text-white">添加账户</div>
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
                        <select v-model="account.currency" class="select-base w-full">
                            <option value="CNY">人民币 (CNY)</option>
                            <option value="USD">美元 (USD)</option>
                            <option value="EUR">欧元 (EUR)</option>
                            <option value="JPY">日元 (JPY)</option>
                        </select>
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
</template>

<style scoped src="@/styles/modal.css"></style>
