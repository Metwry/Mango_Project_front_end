<script setup>
import AddAccount from '@/components/windows/AddAccount.vue';
import ChangeAccount from '@/components/windows/ChangeAccount.vue';
import BaseIcon from '@/components/BaseIcon.vue';
import { ref } from 'vue'

defineProps({
    accounts: { type: Array, default: () => [] }


})
const showAddAccount = ref(false)
const showChangeAccount = ref(false)
const selectedAccount = ref()

// 货币符号
const currencySymbol = (currency) => {
    const map = {
        CNY: '¥',
        USD: '$',
        EUR: '€',
        JPY: '¥',
        GBP: '£',
        HKD: 'HK$',
    }
    return map[(currency || '').toUpperCase()] || (currency ? `${currency} ` : '')
}

const openEditModal = (account) => {
    selectedAccount.value = account  // 先赋值
    showChangeAccount.value = true   // 再打开
    console.log(selectedAccount)
}
</script>

<template>
    <div class="card-base">
        <h3 class="font-bold text-gray-700 dark:text-gray-200 mb-6 flex justify-between items-center">
            账户列表
        </h3>

        <div class="space-y-5">
            <div v-for="acc in accounts" :key="acc.id" class="flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/20 text-primary-600 dark:text-primary-300 flex items-center justify-center font-bold text-sm shadow-sm">
                        {{ (acc.type || '?').substring(0, 1).toUpperCase() }}
                    </div>
                    <div>
                        <p class="text-sm font-bold text-gray-800 dark:text-gray-200 flex gap-1">{{ acc.name }}
                            <button @click="openEditModal(acc)">
                                <BaseIcon name='bookkeeping'
                                    class="w-5 h-5 cursor-pointer text-white-200 dark:text-indigo-300" />
                            </button>
                        </p>
                        <p class="text-xs text-gray-400">{{ acc.type }}</p>
                    </div>
                </div>

                <span class="text-sm font-bold text-gray-700 dark:text-gray-200">
                    {{ currencySymbol(acc.currency) }}{{ (Number(acc.balance) / 1000).toFixed(1) }}k
                </span>
            </div>

            <button @click="showAddAccount = true"
                class="active:scale-90 flex justify-between items-center opacity-50 cursor-pointer hover:opacity-100 transition">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-400 flex items-center justify-center font-bold text-sm">
                        +</div>
                    <p class="text-sm font-medium text-gray-400">添加账户</p>
                </div>
            </button>
        </div>
    </div>
    <AddAccount :isOpen="showAddAccount" @close="showAddAccount = false" />
    <ChangeAccount :isOpen="showChangeAccount" :data="selectedAccount" @close="showChangeAccount = false" />


</template>
