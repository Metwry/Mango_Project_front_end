<script setup>
import PositionCard from "@/components/cards/investmentCards/PositionCard.vue";
import AddPositionCard from "@/components/cards/investmentCards/AddPositionCard.vue";

const demoPosition = {
  symbol: "AAPL",
  name: "Apple Inc.",
  costPrice: 172.36,
  quantity: 120,
  currentPrice: 189.42,
  trend: [1.2, 1.1, 1.5, 1.4, 1.9, 2.2, 2.0, 2.3, 2.8, 2.6, 3.1, 3.4],
};
</script>

<template>
  <div class="h-full w-full bg-gray-50 dark:bg-gray-900">
    <section class="h-full w-full overflow-y-auto p-1">
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 auto-rows-[minmax(24rem,_1fr)]">
        <PositionCard :position="demoPosition" />
        <AddPositionCard />
      </div>
    </section>
  </div>
</template>
