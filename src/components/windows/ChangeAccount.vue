<script setup>
import { ref, watch } from 'vue'
import BaseIcon from '../BaseIcon.vue'
import { useAccountsStore } from '@/stores/accounts'  // ✅ 用 store

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

// 打开弹窗时，把 props.data 拷贝到本地表单
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
        } else {
            account.value = {
                id: null,
                name: '',
                currency: 'CNY',
                balance: null,
                type: ''
            }
        }
    },
    { immediate: true }
)

const UpdateAccount = async () => {
    try {
        if (!account.value.id) return

        // ✅ 调用 store（内部会强制刷新列表）
        await accountsStore.updateAccount(account.value.id, account.value)

        emit('close')
    } catch (error) {
        console.error('更新失败:', error)
    }
}

const DeleteAccount = async () => {
    if (!confirm('确定要删除这个账户吗？删除后无法恢复。')) return

    try {
        if (!account.value.id) return

        // ✅ 调用 store（内部会强制刷新列表）
        await accountsStore.deleteAccount(account.value.id)

        emit('close')
    } catch (error) {
        console.error('删除失败:', error)
    }
}
</script>

<template>
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div class="w-full max-w-2xl max-h-[85vh] overflow-auto rounded-2xl bg-white p-5 md:p-8 dark:bg-gray-800">
            <div class="relative mb-10">
                <h2 class="text-center text-2xl font-bold text-gray-900 dark:text-white">
                    修改账户
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

            <div class="mt-8 flex justify-between items-center">
                <button @click="DeleteAccount" class="ui-btn-primary bg-red-500 hover:bg-red-600"
                    :disabled="accountsStore.saving">
                    删除账户
                </button>

                <button @click="UpdateAccount" class="ui-btn-primary" :disabled="accountsStore.saving">
                    保存修改
                </button>
            </div>
        </div>
    </div>
</template>
