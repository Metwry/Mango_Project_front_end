<script setup>
defineProps({
    amount: { type: Number, required: true },
    change: { type: Number, default: 0 }
})

const formatCurrency = (val) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);
};
</script>

<template>
    <div class="card-base relative overflow-hidden">
        <div class="pointer-events-none absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20">
        </div>

        <div class="relative z-10">
            <div class="card-title">总资产</div>
            <h2 class="text-5xl font-bold mb-4 tracking-tight">{{ formatCurrency(amount) }}</h2>
            <div class="flex items-center gap-2">
                <span
                    class="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                    ▲
                    {{ change }}%
                </span>
                <span class="text-gray-400 text-sm">较上月增长</span>
            </div>
        </div>


    </div>
</template>
