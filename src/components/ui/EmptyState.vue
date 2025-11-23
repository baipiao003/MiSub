/**
 * z���
 * @author MiSub Team
 */

<script setup>
import { computed } from 'vue';

defineProps({
  filteredCount: {
    type: Number,
    default: 0
  },
  totalCount: {
    type: Number,
    default: 0
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: 'search'
  }
});

defineEmits(['reset', 'refresh']);

// 9n�>:���
const displayTitle = computed(() => {
  if (title) return title;

  if (totalCount === 0) {
    return '����pn';
  } else if (filteredCount === 0) {
    return '�	~09M���';
  }
  return '��pn';
});

const displayDescription = computed(() => {
  if (description) return description;

  if (totalCount === 0) {
    return 'SM�-�	�(������Mn����';
  } else if (filteredCount === 0) {
    return '�t��a�"s.�e�~��';
  }
  return '�	�>:�pn';
});

const showResetButton = computed(() => {
  return totalCount > 0 && filteredCount === 0;
});
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 px-4">
    <!-- � -->
    <div class="flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
      <!-- "� -->
      <svg
        v-if="icon === 'search'"
        class="w-8 h-8 text-gray-400 dark:text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>

      <!-- ��9� -->
      <svg
        v-else-if="icon === 'folder'"
        class="w-8 h-8 text-gray-400 dark:text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>

      <!-- ��� -->
      <svg
        v-else-if="icon === 'node'"
        class="w-8 h-8 text-gray-400 dark:text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>

      <!-- ؤ� -->
      <svg
        v-else
        class="w-8 h-8 text-gray-400 dark:text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    </div>

    <!-- ���� -->
    <div class="text-center mb-6">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {{ displayTitle }}
      </h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md">
        {{ displayDescription }}
      </p>
    </div>

    <!-- �\	� -->
    <div class="flex flex-col sm:flex-row gap-3 items-center">
      <!-- �n	� -->
      <button
        v-if="showResetButton"
        @click="$emit('reset')"
        class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        �n��a�
      </button>

      <!-- 7�	� -->
      <button
        v-else
        @click="$emit('refresh')"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        7�pn
      </button>
    </div>

    <!-- ߡ�o -->
    <div v-if="totalCount > 0" class="mt-6 text-xs text-gray-400 dark:text-gray-500">
      ;q {{ totalCount }} *��SM>: {{ filteredCount }} *
    </div>
  </div>
</template>