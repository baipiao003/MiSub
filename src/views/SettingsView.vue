<script setup>
import { ref, computed, onMounted } from 'vue';
import MigrationModal from '../components/modals/MigrationModal.vue';
import { useSettingsLogic } from '../composables/useSettingsLogic.js';

import SettingsSidebar from '../components/settings/SettingsSidebar.vue';
import BasicSettings from '../components/settings/sections/BasicSettings.vue';
import HomeSettings from '../components/settings/sections/HomeSettings.vue';
import ServiceSettings from '../components/settings/sections/ServiceSettings.vue';
import GlobalSettings from '../components/settings/sections/GlobalSettings.vue';

import SystemSettings from '../components/settings/sections/SystemSettings.vue';
import ClientSettings from '../components/settings/sections/ClientSettings.vue';

// 使用 composable 获取所有设置相关的状态和函数
const {
  settings,
  disguiseConfig,
  isLoading,
  isSaving,
  showMigrationModal,
  hasWhitespace,
  isStorageTypeValid,
  loadSettings,
  handleSave,
  handleMigrationSuccess,
  exportBackup,
  importBackup,
} = useSettingsLogic();

// 仅新布局需要的状态
const activeTab = ref('basic');

const currentTabLabel = computed(() => {
  switch (activeTab.value) {
    case 'basic': return '基础设置';
    case 'home': return '首页设置';
    case 'global': return '全局设置';
    case 'service': return '服务集成';

    case 'client': return '客户端管理';
    case 'system': return '系统设置';
    default: return '设置';
  }
});

// 仅新布局需要的函数
const handleOpenMigrationModal = () => {
  showMigrationModal.value = true;
};

// 备份函数已由 composable 提供

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="pt-0 pb-8">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2 mt-2">设置</h1>
    <div class="md:grid md:grid-cols-12 md:gap-6">

      <!-- Sidebar -->
      <aside class="md:col-span-3 mb-4 md:mb-0">
        <div class="sticky top-0 z-20">
          <div
            class="bg-transparent md:bg-white/90 md:dark:bg-gray-900/70 md:shadow-sm md:misub-radius-lg md:overflow-hidden md:border md:border-gray-100/80 md:dark:border-white/10">
            <div class="md:p-2 md:space-y-1">
              <SettingsSidebar v-model:activeTab="activeTab" />
            </div>
          </div>
        </div>
      </aside>

      <!-- Content -->
      <main class="md:col-span-9">
        <div v-if="isLoading" class="text-center p-12 bg-white/90 dark:bg-gray-900/70 misub-radius-lg shadow-sm border border-gray-100/80 dark:border-white/10">
          <svg class="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
            </path>
          </svg>
          <p class="text-gray-500">正在加载设置...</p>
        </div>

        <div v-else
          class="bg-white/90 dark:bg-gray-900/70 shadow-sm misub-radius-lg border border-gray-100/80 dark:border-white/10 min-h-[500px] flex flex-col">
          <!-- Header for Mobile (Removed as tabs are now visible) -->

          <!-- Scrollable Content -->
          <div class="flex-1 p-6">
            <BasicSettings v-show="activeTab === 'basic'" :settings="settings" :disguiseConfig="disguiseConfig" />
            <HomeSettings v-show="activeTab === 'home'" :settings="settings" />
            <GlobalSettings v-show="activeTab === 'global'" :settings="settings" />
            <ServiceSettings v-show="activeTab === 'service'" :settings="settings" />


            <ClientSettings v-show="activeTab === 'client'" />
            <SystemSettings v-show="activeTab === 'system'" :settings="settings" :exportBackup="exportBackup"
              :importBackup="importBackup" @migrate="handleOpenMigrationModal" />
          </div>

          <!-- Footer Actions -->
          <div
            class="px-6 py-4 bg-white/80 dark:bg-gray-900/70 border-t border-gray-100/70 dark:border-white/10 flex justify-end sticky bottom-0 z-10 backdrop-blur-sm rounded-b-3xl">
            <button @click="handleSave" :disabled="isSaving || hasWhitespace || !isStorageTypeValid"
              class="px-6 py-2.5 misub-radius-lg text-white text-sm font-medium shadow-sm transition-all flex items-center gap-2"
              :class="isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 hover:shadow-md active:scale-95'">
              <svg v-if="isSaving" class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg"
                fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                </path>
              </svg>
              <span>{{ isSaving ? '保存中...' : '保存修改' }}</span>
            </button>
          </div>
        </div>
      </main>
    </div>

    <!-- Modals -->
    <MigrationModal v-model:show="showMigrationModal" @success="handleMigrationSuccess" />
  </div>
</template>
