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
        <div class="mb-4 flex flex-col gap-3 sm:mb-5 lg:mb-6">
            <div class="flex items-center justify-between gap-3">
                <h3 class="card-title !px-0 !py-0">账户资产走势</h3>
            </div>

            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                    <button class="button-base !px-3 !py-1.5 !text-xs sm:!text-sm">至今为止</button>
                    <button class="button-base !px-3 !py-1.5 !text-xs sm:!text-sm">近7天</button>
                    <button class="button-base !px-3 !py-1.5 !text-xs sm:!text-sm">近30天</button>
                    <button class="button-base !px-3 !py-1.5 !text-xs sm:!text-sm">近1年</button>
                </div>

                <div class="w-full sm:w-56 sm:shrink-0">
                    <SmallAccountPicker v-model="accountId" :accounts="accounts" />
                </div>
            </div>
        </div>
        <div
            class="flex-1 bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500">
            <div class="text-center">

            </div>
        </div>
    </div>
</template>
