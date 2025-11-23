import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUIStore = defineStore('ui', () => {
  const isSettingsModalVisible = ref(false);
  const isProxySettingsModalVisible = ref(false);

  function show() {
    isSettingsModalVisible.value = true;
  }

  function hide() {
    isSettingsModalVisible.value = false;
  }

  function showProxySettings() {
    isProxySettingsModalVisible.value = true;
  }

  function hideProxySettings() {
    isProxySettingsModalVisible.value = false;
  }

  return {
    isSettingsModalVisible,
    isProxySettingsModalVisible,
    show,
    hide,
    showProxySettings,
    hideProxySettings
  };
});
