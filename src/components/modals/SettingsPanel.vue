<script setup>
import { ref, onMounted } from 'vue';
import MigrationModal from './MigrationModal.vue';
import { useSettingsLogic } from '../../composables/useSettingsLogic.js';

// 导入侧边栏和设置组件
import SettingsSidebar from '../settings/SettingsSidebar.vue';
import BasicSettings from '../settings/sections/BasicSettings.vue';
import HomeSettings from '../settings/sections/HomeSettings.vue';
import ServiceSettings from '../settings/sections/ServiceSettings.vue';
import GlobalSettings from '../settings/sections/GlobalSettings.vue';


import ClientSettings from '../settings/sections/ClientSettings.vue';
import SystemSettings from '../settings/sections/SystemSettings.vue';

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

// 添加标签页状态 (与新布局一致)
const activeTab = ref('basic');

// 组件挂载时加载设置
onMounted(() => {
  loadSettings();
});

// 暴露 handleSave 给父组件
defineExpose({ handleSave });
</script>

<template>
  <div class="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
    <div v-if="isLoading" class="text-center p-8">
      <p class="text-gray-500">正在加载设置...</p>
    </div>
    <div v-else class="flex flex-col md:flex-row gap-6">
      <!-- 侧边栏导航 -->
      <aside class="md:w-48 flex-shrink-0">
        <div class="bg-white dark:bg-gray-800 misub-radius-lg p-2 h-full border border-gray-100 dark:border-gray-700 elevation-2">
          <SettingsSidebar v-model:activeTab="activeTab" />
        </div>
      </aside>

      <!-- 设置内容区域 -->
      <main class="flex-1 min-w-0">
        <div class="space-y-6">
          <!-- 基础设置 -->
          <BasicSettings v-show="activeTab === 'basic'" :settings="settings" :disguiseConfig="disguiseConfig" />

          <!-- 首页设置 -->
          <HomeSettings v-show="activeTab === 'home'" :settings="settings" />
          
          <!-- 全局设置 -->
          <GlobalSettings v-show="activeTab === 'global'" :settings="settings" />
          
          <!-- 服务集成 -->
          <ServiceSettings v-show="activeTab === 'service'" :settings="settings" />

          <!-- 客户端管理 -->
          <ClientSettings v-show="activeTab === 'client'" />
          
          <!-- 系统设置 -->
          <div v-show="activeTab === 'system'" class="space-y-6">

            
            <SystemSettings 
              :settings="settings" 
              :exportBackup="exportBackup" 
              :importBackup="importBackup" 
              @migrate="showMigrationModal = true" 
            />
          </div>
        </div>

      </main>
    </div>

    <MigrationModal v-model:show="showMigrationModal" @success="handleMigrationSuccess" />
  </div>
</template>

<style scoped>

</style>
