<script setup>
import SmallAccountPicker from '@/components/ui/SmallAccountPicker.vue';
import { ref } from 'vue';

defineProps({
    accounts: { type: Array, default: () => [] }


})
const accountId = ref('')

</script>

<template>
    <div class="card-base">
        <div class="flex justify-between items-center mb-6">

            <h3 class="card-title">账户资产走势</h3>

            <div class="flex gap-2">

                <button class="button-base">至今为止</button>
                <button class="button-base">近7天</button>
                <button class="button-base">近30天</button>
                <button class="button-base">近1年</button>


            </div>
            <div class="w-50">
                <SmallAccountPicker v-model="accountId" :accounts="accounts" />
            </div>


        </div>
        <div
            class="flex-1 bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500">
            <div class="text-center">

            </div>
        </div>
    </div>
</template>