<script setup>
import { ref, watch } from 'vue'
import BaseIcon from '../BaseIcon.vue'
// 确保你正确引入了 API 方法
import { updateAccount, deleteAccount } from '@/utils/accounts.js'

const emit = defineEmits(['close', 'refresh'])

const props = defineProps({
    isOpen: Boolean,
    // 1. 新增：接收父组件传来的账户数据
    data: {
        type: Object,
        default: () => ({})
    }
})

// 本地表单数据 (建议改名为 form 以示区别，但这里保留你的 account 命名习惯)
const account = ref({
    id: null, // 记得加上 ID，修改和删除都需要它
    name: '',
    currency: 'CNY',
    balance: 0,
    type: ''
})

// 2. 核心修改：监听 isOpen 和 data 的变化
watch(
    () => props.isOpen,
    (newVal) => {
        if (newVal && props.data) {
            // 💡 关键步：把父组件传来的 data 复制给本地 account
            // 使用 {...props.data} 进行浅拷贝，断开引用，避免在输入时直接影响列表页
            account.value = {
                id: props.data.id,
                name: props.data.name,
                currency: props.data.currency || 'CNY',
                balance: props.data.balance, // 注意：如果后端给的是字符串，可能需要 Number() 转换
                type: props.data.type
            }
        } else {
            // 如果关闭或者是新建模式，重置为空
            account.value = {
                id: null,
                name: '',
                currency: "CNY",
                balance: null,
                type: ''
            }
        }
    },
    { immediate: true } // 立即执行一次
)

// 3. 实现更新逻辑
const UpdateAccount = async () => {
    try {
        if (!account.value.id) return; // 安全检查

        // 发送请求 (根据你的 API 定义，通常传入 id 和 数据)
        await updateAccount(account.value.id, account.value)

        // 成功后：
        emit('refresh') // 通知父组件刷新列表
        emit('close')   // 关闭弹窗
    } catch (error) {
        console.error('更新失败:', error)
        // 这里可以加上 ElMessage.error(error.message)
    }
}

// 4. 实现删除逻辑
const DeleteAccount = async () => {
    // 增加一个确认提示，防止误删
    if (!confirm('确定要删除这个账户吗？删除后无法恢复。')) return;

    try {
        if (!account.value.id) return;

        await deleteAccount(account.value.id)

        emit('refresh')
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
                <button @click="DeleteAccount" class="ui-btn-primary bg-red-500 hover:bg-red-600">
                    删除账户
                </button>

                <button @click="UpdateAccount" class="ui-btn-primary">
                    保存修改
                </button>
            </div>
        </div>
    </div>
</template>