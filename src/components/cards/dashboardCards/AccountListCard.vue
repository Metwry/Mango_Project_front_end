<script setup>
import AddAccount from '@/components/windows/AddAccount.vue';
import ChangeAccount from '@/components/windows/ChangeAccount.vue';
import BaseIcon from '@/components/BaseIcon.vue';

import { ref } from 'vue'

defineProps({
    accounts: { type: Array, default: () => [] }


})
const emit = defineEmits(['refresh'])
const showAddAccount = ref(false)
const showChangeAccount = ref(false)
const selectedAccount = ref()
//刷新列表
const handleRefresh = () => {

    showAddAccount.value = false
    showChangeAccount.value = false

    emit('refresh')
}

const openEditModal = (account) => {
    selectedAccount.value = account  // 先赋值
    showChangeAccount.value = true   // 再打开
    console.log(selectedAccount)
}
</script>

<template>
    <div
        class="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-full">
        <h3 class="font-bold text-gray-700 dark:text-gray-200 mb-6 flex justify-between items-center">
            账户列表
            <!-- <button class="text-xs text-primary-600 dark:text-primary-300 hover:underline">查看全部</button> -->
        </h3>

        <div class="flex-1 space-y-5 overflow-y-auto pr-1 custom-scrollbar">
            <div v-for="acc in accounts" :key="acc.name" class="flex justify-between items-center">
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
                    ¥{{ (Number(acc.balance) / 1000).toFixed(1) }}k
                </span>
            </div>

            <button @click="showAddAccount = true"
                class="flex justify-between items-center opacity-50 cursor-pointer hover:opacity-100 transition">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-400 flex items-center justify-center font-bold text-sm">
                        +</div>
                    <p class="text-sm font-medium text-gray-400">添加账户</p>
                </div>
            </button>
        </div>
    </div>
    <AddAccount :isOpen="showAddAccount" @close="showAddAccount = false" @refresh="handleRefresh" />
    <ChangeAccount :isOpen="showChangeAccount" :data="selectedAccount" @close="showChangeAccount = false"
        @refresh="handleRefresh" />


</template>
