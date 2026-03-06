<script setup>
import { computed } from 'vue';

const props = defineProps({
  formattedTotalRemainingTraffic: {
    type: String,
    default: '0 B'
  },
  trafficStats: {
    type: Object,
    required: true
  },
  activeSubscriptionsCount: {
    type: Number,
    default: 0
  },
  subscriptionsCount: {
    type: Number,
    default: 0
  },
  totalNodesCount: {
    type: Number,
    default: 0
  },
  activeProfilesCount: {
    type: Number,
    default: 0
  }
});

const trafficDisplay = computed(() => {
  const parts = props.formattedTotalRemainingTraffic.split(' ');
  return {
    value: parts[0] || props.formattedTotalRemainingTraffic,
    unit: parts[1] || ''
  };
});
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <!-- Card 1: Traffic -->
    <div class="bg-white/90 dark:bg-gray-900/70 p-4 misub-radius-lg shadow-sm border border-gray-100/80 dark:border-white/10">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-xs font-medium text-gray-500 uppercase">剩余流量</h3>
        <span class="p-1.5 misub-radius-md bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </span>
      </div>
      <p class="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight leading-none">
        {{ trafficDisplay.value }}
        <span class="ml-1 text-xs font-medium text-gray-500 dark:text-gray-400">{{ trafficDisplay.unit }}</span>
      </p>
      <div class="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div class="bg-green-500 h-1.5 rounded-full" :style="{ width: (100 - trafficStats.percentage) + '%' }"></div>
      </div>
      <p class="text-xs text-gray-400 mt-1">已用 {{ trafficStats.used }} / {{ trafficStats.total }}</p>
    </div>

    <!-- Card 2: Active Subs -->
    <div class="bg-white/90 dark:bg-gray-900/70 p-4 misub-radius-lg shadow-sm border border-gray-100/80 dark:border-white/10">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-xs font-medium text-gray-500 uppercase">活跃订阅</h3>
        <span class="p-1.5 misub-radius-md bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        </span>
      </div>
      <p class="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight leading-none">
        {{ activeSubscriptionsCount }}
        <span class="text-xs font-medium text-gray-500 dark:text-gray-400">/ {{ subscriptionsCount }}</span>
      </p>
      <p class="text-xs text-green-600 mt-2 flex items-center">
        <span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span> 正常运行
      </p>
    </div>

    <!-- Card 3: Total Nodes -->
    <div class="bg-white/90 dark:bg-gray-900/70 p-4 misub-radius-lg shadow-sm border border-gray-100/80 dark:border-white/10">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-xs font-medium text-gray-500 uppercase">节点总数</h3>
        <span class="p-1.5 misub-radius-md bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </span>
      </div>
      <p class="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight leading-none">{{ totalNodesCount }}</p>
      <p class="text-xs text-gray-400 mt-2">来自 {{ subscriptionsCount }} 个订阅源</p>
    </div>
    
    <!-- Card 4: Profiles -->
    <div class="bg-white/90 dark:bg-gray-900/70 p-4 misub-radius-lg shadow-sm border border-gray-100/80 dark:border-white/10">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-xs font-medium text-gray-500 uppercase">组合订阅</h3>
        <span class="p-1.5 misub-radius-md bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        </span>
      </div>
      <p class="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight leading-none">{{ activeProfilesCount }}</p>
      <p class="text-xs text-gray-400 mt-2">已发布 {{ activeProfilesCount }} 个组合</p>
    </div>
  </div>
</template>
