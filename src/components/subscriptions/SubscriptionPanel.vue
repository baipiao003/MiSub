<script setup>
import { computed } from 'vue';
import draggable from 'vuedraggable';
import Card from '../ui/Card.vue';
import MoreActionsMenu from '@/components/shared/MoreActionsMenu.vue';
import PanelHeader from '@/components/shared/PanelHeader.vue';
import PanelPagination from '@/components/shared/PanelPagination.vue';

const props = defineProps({
  subscriptions: { type: Array, default: () => [] },
  paginatedSubscriptions: Array,
  currentPage: Number,
  totalPages: Number,
  isSorting: Boolean,
});

const emit = defineEmits(['add', 'delete', 'changePage', 'updateNodeCount', 'edit', 'toggleSort', 'markDirty', 'preview', 'deleteAll', 'refreshAll', 'reorder', 'import', 'qrcode']);

const draggableSubscriptions = computed({
    get: () => [...props.subscriptions],
    set: (val) => emit('reorder', val)
});

const handleDelete = (id) => emit('delete', id);
const handleEdit = (id) => emit('edit', id);
const handleUpdate = (id) => emit('updateNodeCount', id);
const handlePreview = (id) => emit('preview', id);
const handleQRCode = (id) => emit('qrcode', id);
const handleAdd = () => emit('add');
const handleChangePage = (page) => emit('changePage', page);
const handleToggleSort = () => emit('toggleSort');
const handleSortEnd = () => emit('markDirty');
const handleDeleteAll = () => emit('deleteAll');
const handleRefreshAll = () => emit('refreshAll');
const handleImport = () => emit('import');
</script>

<template>
  <div>
    <PanelHeader title="机场订阅" :count="subscriptions.length">
      <template #actions>
        <slot name="actions-prepend"></slot>
        <button @click="handleAdd" class="text-sm font-medium px-4 py-2 misub-radius-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-sm shadow-primary-500/20 shrink-0">新增</button>
        <MoreActionsMenu menu-width-class="w-36">
          <template #menu="{ close }">
            <button @click="handleImport(); close()" class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
              批量导入
            </button>
            <div class="border-t border-gray-100 dark:border-gray-700/50 my-1"></div>
            <button @click="handleRefreshAll(); close()" class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
              全部刷新
            </button>
            <button @click="handleToggleSort(); close()" class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
              {{ isSorting ? '完成排序' : '手动排序' }}
            </button>
            <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
            <button @click="handleDeleteAll(); close()" class="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10">清空所有</button>
          </template>
        </MoreActionsMenu>
      </template>
    </PanelHeader>
    <div v-if="subscriptions.length > 0">
      <draggable 
        v-if="isSorting" 
        tag="div" 
        class="grid grid-cols-1 md:grid-cols-2 gap-5" 
        v-model="draggableSubscriptions" 
        item-key="id"
        animation="300" 
        @end="handleSortEnd">
        <template #item="{ element: subscription }">
          <div class="cursor-move">
              <Card
                  :misub="subscription"
                  @delete="handleDelete(subscription.id)"
                  @change="handleSortEnd"
                  @update="handleUpdate(subscription.id)"
                  @edit="handleEdit(subscription.id)"
                  @preview="handlePreview(subscription.id)"
                  @qrcode="handleQRCode(subscription.id)" />
          </div>
        </template>
      </draggable>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div 
              v-for="(subscription, index) in paginatedSubscriptions"
              :key="subscription.id"
              class="list-item-animation"
              :style="{ '--delay-index': index }"
          >   
              <Card
                  :misub="subscription"
                  @delete="handleDelete(subscription.id)"
                  @change="handleSortEnd"
                  @update="handleUpdate(subscription.id)"
                  @edit="handleEdit(subscription.id)"
                  @preview="handlePreview(subscription.id)"
                  @qrcode="handleQRCode(subscription.id)" />
          </div>
      </div>
      <PanelPagination
        v-if="totalPages > 1 && !isSorting"
        :current-page="currentPage"
        :total-pages="totalPages"
        @change-page="handleChangePage"
      />
    </div>
    <div v-else class="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 misub-radius-lg"><svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg><h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">没有机场订阅</h3><p class="mt-1 text-sm text-gray-500">从添加你的第一个订阅开始。</p></div>
  </div>
</template>

<style scoped>
.cursor-move {
  cursor: move;
}
</style>
