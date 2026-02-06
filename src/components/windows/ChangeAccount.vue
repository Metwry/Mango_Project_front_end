<script setup>
import { ref, watch } from 'vue'
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
// todo  美化提示框
const UpdateAccount = async () => {
    try {
        if (!account.value.id) return

        await accountsStore.updateAccount(account.value.id, account.value)

        emit('close')
    } catch (error) {
        console.error('更新失败:', error)
    }
}

const DeleteAccount = async () => {
    try {
        await ElMessageBox.confirm('确定删除？删除后无法恢复。')
    } catch {
        return
    }

    try {
        if (!account.value.id) return

        await accountsStore.deleteAccount(account.value.id)
        emit('close')
        ElMessage.success("删除成功");

    } catch (error) {
        if (error.response && error.response.status === 500) {
            ElMessage.error("删除失败：该账户下包含交易记录…");
        } else {
            ElMessage.error("删除失败");
        }
    }
}
</script>

<template>
    <Transition name="modal">
        <div v-if="isOpen"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-hidden">

            <div
                class="modal-content relative w-full max-w-2xl max-h-[85vh] overflow-auto rounded-3xl bg-white p-6 md:p-8 dark:bg-gray-800 shadow-2xl">

                <div class="relative mb-8">
                    <h2 class="text-center text-2xl font-bold text-gray-900 dark:text-white">
                        修改账户
                    </h2>
                    <button @click="emit('close')"
                        class="absolute right-0 top-1 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <BaseIcon name="closeIcon" class="h-5 w-5 cursor-pointer" />
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                    <div class="space-y-2">
                        <label class="label-text">账户名称:</label>
                        <input v-model="account.name" type="text" class="input-base w-full" placeholder="例如：招商银行" />
                    </div>

                    <div class="space-y-2">
                        <label class="label-text">账户类型:</label>
                        <input v-model="account.type" type="text" class="input-base w-full" placeholder="例如：储蓄卡、基金" />
                    </div>

                    <div class="space-y-2">
                        <label class="label-text">当前余额:</label>
                        <input v-model.number="account.balance" type="number" class="input-base w-full"
                            placeholder="0.00" />
                    </div>

                    <div class="space-y-2">
                        <label class="label-text">币种:</label>
                        <select v-model="account.currency" class="select-base w-full">
                            <option value="CNY">人民币(CNY)</option>
                            <option value="USD">美元(USD)</option>
                            <option value="EUR">欧元 (EUR)</option>
                        </select>
                    </div>
                </div>

                <div class="mt-10 flex justify-between items-center">
                    <button @click="DeleteAccount"
                        class="button-base bg-red-500 hover:bg-red-600 transform active:scale-90 transition-all"
                        :disabled="accountsStore.saving">
                        删除账户
                    </button>

                    <button @click="UpdateAccount"
                        class="button-base px-8 py-2.5 transform active:scale-90 transition-all"
                        :disabled="accountsStore.saving">
                        {{ accountsStore.saving ? '保存中...' : '保存修改' }}
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped src="@/styles/modal.css"></style>
