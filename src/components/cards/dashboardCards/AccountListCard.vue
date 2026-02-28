<script setup>
import AddAccount from '@/components/windows/AddAccount.vue'
import ChangeAccount from '@/components/windows/ChangeAccount.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import { computed, ref } from 'vue'
import { formatCurrencyAmount, toSafeNumber } from '@/utils/formatters'

const props = defineProps({
    accounts: { type: Array, default: () => [] }
})

const showAddAccount = ref(false)
const showChangeAccount = ref(false)
const selectedAccount = ref()

const sortedAccounts = computed(() => {
    return [...(props.accounts || [])].sort((a, b) => {
        const left = Math.abs(toSafeNumber(a?.valueCny ?? a?.balance))
        const right = Math.abs(toSafeNumber(b?.valueCny ?? b?.balance))
        return right - left
    })
})

const formatAccountBalance = (account) => {
    const amount = toSafeNumber(account?.balance)
    const currency = String(account?.currency || 'CNY').toUpperCase()
    return formatCurrencyAmount(amount, currency, { fallbackWithCode: true })
}

const openEditModal = (item) => {
    selectedAccount.value = item
    showChangeAccount.value = true
}
</script>

<template>
    <div class="card-base">

        <div class="center">
            <div class="card-title">账户列表</div>
            <!-- <button class="button-base ring-0">转账</button> -->
        </div>


        <div class="py-5 space-y-4">
            <div v-for="item in sortedAccounts" :key="item.id" class="center">
                <div class="flex items-center gap-3">
                    <div
                        class="py-1 w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-500/20 text-primary-600 dark:text-primary-300 flex items-center justify-center text-sm">
                        {{ (item.type || '').substring(0, 1).toUpperCase() }}
                    </div>
                    <div>
                        <p class="text-sm text-gray-800 dark:text-gray-200 flex">{{ item.name }}
                            <button class=" border-0 ring-0 py-0.5 button-base" @click="openEditModal(item)">
                                <BaseIcon name='bookkeeping' class="w-3 h-3" />
                            </button>
                        </p>
                        <p class="text-xs text-gray-400">{{ item.type }}</p>
                    </div>
                </div>

                <span class="text-sm font-bold text-gray-700 dark:text-gray-200">
                    {{ formatAccountBalance(item) }}
                </span>
            </div>

            <button @click="showAddAccount = true" class="button-base ring-0 bg-transparent w-full border-0 px-0 py-0">
                <div class="flex items-center gap-3">
                    <div
                        class="rounded-full w-10 h-10 bg-gray-100 dark:bg-gray-700 text-gray-400 flex items-center justify-center font-bold text-sm">
                        +</div>
                    <p class="text-sm font-medium text-gray-400">添加账户</p>
                </div>
            </button>
        </div>
    </div>
    <AddAccount :isOpen="showAddAccount" @close="showAddAccount = false" />
    <ChangeAccount :isOpen="showChangeAccount" :data="selectedAccount" @close="showChangeAccount = false" />


</template>
