<script setup>
import AddAccount from '@/components/windows/AddAccount.vue'
import ChangeAccount from '@/components/windows/ChangeAccount.vue'
import TransferFunds from '@/components/windows/TransferFunds.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import { computed, ref } from 'vue'
import { ElMessage } from "element-plus";
import { useAccountsStore } from "@/stores/accounts";
import { getAccountColorById } from '@/utils/accountColors'
import { formatCurrencyAmount, toSafeNumber } from '@/utils/formatters'
import { createTransfer } from "@/utils/transfer";

const props = defineProps({
    accounts: { type: Array, default: () => [] }
})

const showAddAccount = ref(false)
const showChangeAccount = ref(false)
const showTransferModal = ref(false)
const selectedAccount = ref()
const transferSubmitting = ref(false)
const accountsStore = useAccountsStore()

const sortedAccounts = computed(() => {
    return [...(props.accounts || [])].sort((a, b) => {
        const left = toSafeNumber(a?.valueCny ?? a?.balance)
        const right = toSafeNumber(b?.valueCny ?? b?.balance)
        return right - left
    })
})

const formatAccountBalance = (account) => {
    const amount = toSafeNumber(account?.balance)
    const currency = String(account?.currency || 'CNY').toUpperCase()
    return formatCurrencyAmount(amount, currency, {
        fallbackWithCode: true,
        symbolOnly: true,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

const openEditModal = (item) => {
    selectedAccount.value = item
    showChangeAccount.value = true
}

const getAccountBadgeStyle = (account) => {
    const accountKey = account?.name ?? account?.id ?? account?.accountId ?? account?.account_id ?? ''
    const color = getAccountColorById(accountKey)
    return {
        borderColor: color,
        backgroundColor: color,
    }
}

const getAccountThemeColor = (account) => {
    const accountKey = account?.name ?? account?.id ?? account?.accountId ?? account?.account_id ?? ''
    return getAccountColorById(accountKey)
}

const getAccountInitial = (account) => {
    const name = String(account?.name ?? '').trim()
    if (!name) return '?'
    return name.substring(0, 1).toUpperCase()
}

const onTransferClick = () => {
    showTransferModal.value = true
}

async function onTransferSubmit(payload) {
    transferSubmitting.value = true
    try {
        await createTransfer(payload)
        await accountsStore.fetchAccounts({ force: true })
        showTransferModal.value = false
        ElMessage.success("转账成功")
    } catch {
    } finally {
        transferSubmitting.value = false
    }
}
</script>

<template>
    <div class="h-full min-h-0">
        <div class="card-base">

            <div class="center">
                <div class="card-title">账户列表</div>
                <button class="button-base ring-0 !px-3 !py-1.5 text-xs sm:text-sm" @click="onTransferClick">转账</button>
            </div>


            <div class="min-h-0 flex-1 overflow-y-auto py-5 pr-1 space-y-4">
                <div v-for="item in sortedAccounts" :key="item.id" class="center gap-3">
                    <div class="flex min-w-0 items-center gap-3">
                        <div
                            class="py-1 w-10 h-10 rounded-full border flex items-center justify-center text-sm font-bold text-gray-300 dark:text-gray-300"
                            :style="getAccountBadgeStyle(item)">
                            {{ getAccountInitial(item) }}
                        </div>
                        <div class="min-w-0">
                            <p class="flex items-center gap-1.5 text-sm text-gray-800 dark:text-gray-200">
                                <span class="truncate" :style="{ color: getAccountThemeColor(item) }">{{ item.name }}</span>
                                <button type="button"
                                    class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-transparent text-gray-500 transition-colors duration-200 hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300/70 dark:text-gray-400 dark:hover:bg-gray-700/60 dark:hover:text-gray-200 dark:focus:ring-gray-300/70"
                                    :title="`编辑 ${item.name || '账户'}`" @click="openEditModal(item)">
                                    <BaseIcon name='bookkeeping' class="h-3.5 w-3.5" />
                                </button>
                            </p>
                            <p class="truncate text-xs text-gray-400">{{ item.type }}</p>
                        </div>
                    </div>

                    <span class="shrink-0 text-sm font-bold text-gray-700 dark:text-gray-200">
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
        <TransferFunds :is-open="showTransferModal" :accounts="props.accounts" :submitting="transferSubmitting"
            @close="showTransferModal = false" @submit="onTransferSubmit" />
    </div>
</template>
