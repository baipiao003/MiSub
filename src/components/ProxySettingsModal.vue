<template>
  <Transition name="modal-fade">
    <div v-if="props.show" class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" @click="closeModal">
      <Transition name="modal-inner">
        <div v-if="props.show" class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full text-left ring-1 ring-black/5 dark:ring-white/10 flex flex-col max-h-[90vh] max-w-4xl" @click.stop>

          <!-- 模态窗口头部 -->
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">代理服务插件设置</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">VLESS + Trojan 代理功能 (可选插件)</p>
              </div>
            </div>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

        <!-- 模态窗口内容 -->
          <div class="flex-1 overflow-y-auto p-6 grow">
            <!-- 错误提示 -->
            <div v-if="proxyStore.lastError"
                 class="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg flex items-start space-x-3">
              <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="flex-1">
                <p class="text-red-800 dark:text-red-400 font-medium">错误</p>
                <p class="text-red-600 dark:text-red-300 text-sm mt-1">{{ proxyStore.lastError }}</p>
              </div>
              <button @click="proxyStore.clearError" class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
        </div>

        <!-- 测试结果提示 -->
        <div v-if="proxyStore.lastTestResult"
             :class="[
               'mb-6 p-4 border rounded-lg flex items-start space-x-3',
               proxyStore.lastTestResult.success
                 ? 'bg-green-50 border-green-200'
                 : 'bg-red-50 border-red-200'
             ]">
          <svg class="w-5 h-5 flex-shrink-0 mt-0.5"
               :class="proxyStore.lastTestResult.success ? 'text-green-500' : 'text-red-500'"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="proxyStore.lastTestResult.success"
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path v-else
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div class="flex-1">
            <p :class="[
              'font-medium',
              proxyStore.lastTestResult.success ? 'text-green-800' : 'text-red-800'
            ]">
              {{ proxyStore.lastTestResult.success ? '配置测试通过' : '配置测试失败' }}
            </p>
            <p :class="[
              'text-sm mt-1',
              proxyStore.lastTestResult.success ? 'text-green-600' : 'text-red-600'
            ]">
              {{ proxyStore.lastTestResult.message || proxyStore.lastTestResult.error }}
            </p>
          </div>
          <button @click="proxyStore.clearTestResult"
                  :class="[
                    'hover:text-red-700',
                    proxyStore.lastTestResult.success ? 'text-green-500 hover:text-green-700' : 'text-red-500 hover:text-red-700'
                  ]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- 配置表单 -->
        <div class="space-y-6">
          <!-- 服务开关 -->
          <div class="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-medium text-gray-900 dark:text-white">启用代理服务</span>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">开启后将提供VLESS和Trojan代理服务</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox"
                       v-model="proxyConfig.enabled"
                       @change="onServiceToggle"
                       class="sr-only peer">
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-indigo-600 dark:peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>

          <!-- 支持的协议 -->
          <div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <svg class="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              支持的协议
            </h3>
            <div class="grid grid-cols-1 gap-4">
              <!-- VLESS 默认启用显示 -->
              <div class="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div class="w-4 h-4 text-indigo-600 rounded flex items-center justify-center">
                  <svg class="w-3 h-3 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div>
                  <span class="font-medium text-gray-900 dark:text-white">VLESS</span>
                  <p class="text-sm text-gray-500 dark:text-gray-400">轻量级代理协议（默认启用）</p>
                </div>
              </div>

              <!-- Trojan 协议开关 -->
              <div class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                   :class="{ 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20': proxyConfig.enableTrojan }">
                <div>
                  <span class="font-medium text-gray-900 dark:text-white">Trojan</span>
                  <p class="text-sm text-gray-500 dark:text-gray-400">基于HTTPS的代理协议</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox"
                         v-model="proxyConfig.enableTrojan"
                         class="sr-only peer">
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-indigo-600 dark:peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
          </div>

          <!-- 基础配置 -->
          <div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <svg class="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              基础配置
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- UUID -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  用户UUID <span class="text-red-500">*</span>
                </label>
                <input type="text"
                       v-model="proxyConfig.uuid"
                       placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                       class="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white">
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">用于标识用户的唯一标识符</p>
              </div>

              <!-- 代理IP -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  代理IP <span class="text-red-500">*</span>
                </label>
                <input type="text"
                       v-model="proxyConfig.proxyIP"
                       placeholder="IP:端口 或 域名:端口"
                       class="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white">
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">代理服务器的地址和端口</p>
              </div>

              <!-- 订阅路径 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  订阅路径 <span class="text-red-500">*</span>
                </label>
                <input type="text"
                       v-model="proxyConfig.subPath"
                       placeholder="link"
                       class="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white">
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">代理订阅的访问路径</p>
              </div>
            </div>
          </div>

          <!-- 优选IP管理 -->
          <div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <svg class="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              优选IP列表
            </h3>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                优选节点配置
              </label>
              <textarea v-model="cfipText"
                        rows="8"
                        placeholder="每行一个，格式：IP:端口#备注"
                         class="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm text-gray-900 dark:text-white"></textarea>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                每行一个优选IP，格式：IP:端口 或 IP:端口#备注名称。支持IPv4、域名和IPv6格式。
              </p>
            </div>
          </div>

          <!-- 代理订阅链接 -->
          <div
               class="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-green-200 dark:border-green-500/20">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <svg class="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              代理订阅链接
            </h3>
            <div class="space-y-3">
              <div class="flex items-center space-x-3">
                <input :value="proxyStore.proxySubscriptionUrl"
                       readonly
                       @click="copySubscription"
                       class="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600">
                <button @click="copySubscription"
                        class="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition-colors flex items-center space-x-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>复制链接</span>
                </button>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                支持的协议: <span class="font-medium">{{ proxyStore.enabledProtocols.join('、') }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 模态窗口底部 -->
      <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-end shrink-0">
        <div class="flex items-center space-x-3">
          <button @click="testConfig"
                  :disabled="proxyStore.isSaving || !proxyConfig.enabled"
                  class="px-4 py-2 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>测试配置</span>
          </button>
          <button @click="closeModal"
                  class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
            取消
          </button>
          <button @click="saveConfig"
                  :disabled="proxyStore.isSaving || !canSave"
                  class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2">
            <svg v-if="proxyStore.isSaving" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{{ proxyStore.isSaving ? '保存中...' : '保存配置' }}</span>
          </button>
        </div>
      </div>
      </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useProxyStore } from '@/stores/proxy';
import { useToastStore } from '@/stores/toast';

// Props
const props = defineProps({
  show: {
    type: Boolean,
    required: true
  }
});

// Emits
const emit = defineEmits(['close']);

// Stores
const proxyStore = useProxyStore();
const toastStore = useToastStore();

// Local state
const cfipText = ref('');

// Computed
const proxyConfig = computed({
  get: () => proxyStore.proxyConfig,
  set: (value) => proxyStore.updateConfig(value)
});

const canSave = computed(() => {
  if (!proxyConfig.value.enabled) return true;
  return proxyStore.hasValidConfig;
});

// Watchers
watch(() => proxyConfig.value.cfipList, (newList) => {
  cfipText.value = newList.join('\n');
}, { immediate: true });

watch(cfipText, (newText) => {
  const lines = newText.split('\n')
    .map(line => line.trim())
    .filter(line => line);
  proxyConfig.value.cfipList = lines;
});

// Methods
async function onServiceToggle() {
  // 移除强制配置验证，允许用户自由启用服务
  // 如果配置不完整，会通过其他方式提醒用户
}

async function saveConfig() {
  if (!canSave.value) {
    toastStore.showToast('配置验证失败，请检查必填项', 'error');
    return;
  }

  const result = await proxyStore.saveProxyConfig();
  if (result.success) {
    toastStore.showToast('代理配置保存成功', 'success');
    closeModal();
  } else {
    toastStore.showToast(result.error || '保存失败', 'error');
  }
}

async function testConfig() {
  const result = await proxyStore.testProxyConfig();
  if (result.success) {
    toastStore.showToast('配置测试通过', 'success');
    // 延迟清除测试结果，让用户有时间看到
    setTimeout(() => {
      proxyStore.clearTestResult();
    }, 3000);
  } else {
    toastStore.showToast(result.error || '配置测试失败', 'error');
    // 错误消息也延迟清除
    setTimeout(() => {
      proxyStore.clearTestResult();
    }, 5000);
  }
}



function copySubscription() {
  const url = proxyStore.proxySubscriptionUrl;
  if (!url) {
    toastStore.showToast('订阅链接无效', 'error');
    return;
  }

  navigator.clipboard.writeText(url).then(() => {
    toastStore.showToast('订阅链接��复制到剪贴板', 'success');
  }).catch(() => {
    // 降级方案
    const textArea = document.createElement('textarea');
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    toastStore.showToast('订阅链接已复制到剪贴板', 'success');
  });
}

function closeModal() {
  emit('close');
}

// Lifecycle
onMounted(async () => {
  // 不要在组件挂载时自动获取配置，避免强制显示
  // if (props.show) {
  //   await proxyStore.fetchProxyConfig();
  // }
});

// Keyboard shortcuts
function handleKeydown(event) {
  if (event.key === 'Escape') {
    closeModal();
  }
}

// Add/remove keyboard listener
watch(() => props.show, (newValue) => {
  if (newValue) {
    document.addEventListener('keydown', handleKeydown);
    // 只有在模态窗口显示时才获取配置
    proxyStore.fetchProxyConfig();
  } else {
    document.removeEventListener('keydown', handleKeydown);
  }
}, { immediate: true }); // 添加 immediate: true 以确保初始化时正确设置状态
</script>

<style scoped>
/* 自定义样式 */
.bg-gradient-to-r {
  background-image: linear-gradient(to right, var(--tw-gradient-stops));
}

.text-gradient {
  background-clip: text;
  -webkit-background-clip: text;
}

/* 滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* 模态窗口动画效果 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-inner-enter-active,
.modal-inner-leave-active {
  transition: all 0.3s ease-out;
}
.modal-inner-enter-active,
.modal-inner-leave-active {
  transition: all 0.25s ease;
}
.modal-inner-enter-from,
.modal-inner-leave-to {
  opacity: 0;
  transform: translateY(50px);
}
@media (min-width: 768px) {
  .modal-inner-enter-from,
  .modal-inner-leave-to {
    opacity: 0;
    transform: scale(0.95);
  }
}

/* Focus样式 */
.focus\:ring-2:focus {
  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
}
</style>