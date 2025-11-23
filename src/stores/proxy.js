import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// 默认代理配置 - 初始为空
const defaultProxyConfig = {
    enabled: false,
    enableVLESS: true,        // VLESS 默认启用，但UI中不显示开关
    enableTrojan: false,      // Trojan 默认关闭
    uuid: '',                 // UUID 初始为空
    proxyIP: '',              // 代理IP 初始为空
    subPath: 'link',          // 订阅路径有默认值
    cfipList: []              // 优选IP列表初始为空
};

export const useProxyStore = defineStore('proxy', () => {
    // 状态
    const proxyConfig = ref({ ...defaultProxyConfig });
    const proxyServiceStatus = ref('stopped'); // stopped, starting, running, error
    const isLoading = ref(false);
    const isSaving = ref(false);
    const lastError = ref('');
    const lastTestResult = ref(null);

    // 计算属性
    const isProxyEnabled = computed(() => proxyConfig.value.enabled || false);

    const proxySubscriptionUrl = computed(() => {
        if (!isProxyEnabled.value) return '';
        const baseUrl = window.location.origin;
        const subPath = proxyConfig.value.subPath || 'link';
        // 移除密码参数，使用MiSub的密码保护
        return `${baseUrl}/proxy/${subPath}`;
    });

    const hasValidConfig = computed(() => {
        const config = proxyConfig.value;
        // 如果没有启用代理服务，则不需要验证其他字段
        if (!config.enabled) return true;

        // 启用代理服务时，需要验证必要的字段
        return config.uuid &&
               config.proxyIP &&
               config.subPath;
    });

    const enabledProtocols = computed(() => {
        const protocols = [];
        if (proxyConfig.value.enableVLESS) protocols.push('VLESS');
        if (proxyConfig.value.enableTrojan) protocols.push('Trojan');
        return protocols;
    });

    // 方法
    async function fetchProxyConfig() {
        isLoading.value = true;
        lastError.value = '';

        try {
            const response = await fetch('/api/proxy/config');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            if (result.success) {
                proxyConfig.value = { ...defaultProxyConfig, ...result.config };
            } else {
                throw new Error(result.error || '获取配置失败');
            }
        } catch (error) {
            console.error('获取代理配置失败:', error);
            lastError.value = error.message;
            // 使用默认配置
            proxyConfig.value = { ...defaultProxyConfig };
        } finally {
            isLoading.value = false;
        }
    }

    async function saveProxyConfig(config = null) {
        const configToSave = config || proxyConfig.value;
        isSaving.value = true;
        lastError.value = '';

        try {
            const response = await fetch('/api/proxy/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ config: configToSave })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            if (result.success) {
                // 更新本地配置
                proxyConfig.value = { ...result.config };
                return { success: true };
            } else {
                throw new Error(result.error || '保存配置失败');
            }
        } catch (error) {
            console.error('保存代理配置失败:', error);
            lastError.value = error.message;
            return { success: false, error: error.message };
        } finally {
            isSaving.value = false;
        }
    }

    async function testProxyConfig(config = null) {
        const configToTest = config || proxyConfig.value;
        lastTestResult.value = null;

        try {
            const response = await fetch('/api/proxy/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ config: configToTest })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            lastTestResult.value = result;
            return result;
        } catch (error) {
            console.error('测试代理配置失败:', error);
            const result = {
                success: false,
                error: error.message
            };
            lastTestResult.value = result;
            return result;
        }
    }

    async function resetToDefaults() {
        isSaving.value = true;
        lastError.value = '';

        try {
            const response = await fetch('/api/proxy/reset', {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            if (result.success) {
                proxyConfig.value = { ...result.config };
                return { success: true };
            } else {
                throw new Error(result.error || '重置配置失败');
            }
        } catch (error) {
            console.error('重置代理配置失败:', error);
            lastError.value = error.message;
            return { success: false, error: error.message };
        } finally {
            isSaving.value = false;
        }
    }

    async function fetchProxyStatus() {
        try {
            const response = await fetch('/api/proxy/status');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            if (result.success) {
                proxyServiceStatus.value = result.status.running ? 'running' : 'stopped';
                return result.status;
            }
        } catch (error) {
            console.error('获取代理状态失败:', error);
            proxyServiceStatus.value = 'error';
        }
        return null;
    }

    async function toggleProxyService() {
        if (!hasValidConfig.value) {
            return { success: false, error: '代理配置无效，请检查配置' };
        }

        const newEnabled = !proxyConfig.value.enabled;
        const newConfig = { ...proxyConfig.value, enabled: newEnabled };

        return await saveProxyConfig(newConfig);
    }

    function updateConfigField(field, value) {
        proxyConfig.value = {
            ...proxyConfig.value,
            [field]: value
        };
    }

    function updateConfig(updates) {
        proxyConfig.value = {
            ...proxyConfig.value,
            ...updates
        };
    }

    function resetConfig() {
        proxyConfig.value = { ...defaultProxyConfig };
    }

    function clearError() {
        lastError.value = '';
    }

    function clearTestResult() {
        lastTestResult.value = null;
    }

    // 验证方法
    function validateConfig(config = null) {
        const configToValidate = config || proxyConfig.value;
        const errors = [];

        // 检查UUID格式
        if (configToValidate.uuid) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(configToValidate.uuid)) {
                errors.push('UUID格式无效');
            }
        }

        // 检查代理IP格式 - 支持IPv4、域名和IPv6，端口可选
        if (configToValidate.proxyIP) {
            // IPv6格式 (带或不带端口)
            const ipv6WithPortRegex = /^\[([0-9a-fA-F:]+)\]:(\d{1,5})$/;
            const ipv6WithoutPortRegex = /^\[([0-9a-fA-F:]+)\]$/;

            // IPv4或域名格式 (带或不带端口)
            const ipPortRegex = /^([^:]+):(\d{1,5})$/;
            const simpleIpRegex = /^([^:]+)$/;

            let isValid = false;

            // 检查IPv6格式
            if (ipv6WithPortRegex.test(configToValidate.proxyIP)) {
                const match = configToValidate.proxyIP.match(ipv6WithPortRegex);
                const ipv6 = match[1];
                const port = parseInt(match[2]);

                const ipv6RegexCheck = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
                isValid = ipv6RegexCheck.test(ipv6) && port >= 1 && port <= 65535;
            } else if (ipv6WithoutPortRegex.test(configToValidate.proxyIP)) {
                const match = configToValidate.proxyIP.match(ipv6WithoutPortRegex);
                const ipv6 = match[1];

                const ipv6RegexCheck = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
                isValid = ipv6RegexCheck.test(ipv6);
            } else if (ipPortRegex.test(configToValidate.proxyIP)) {
                // 检查IP:端口或域名:端口格式
                const match = configToValidate.proxyIP.match(ipPortRegex);
                const address = match[1];
                const port = parseInt(match[2]);

                // IPv4验证
                const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
                // 域名验证
                const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

                isValid = (ipv4Regex.test(address) || domainRegex.test(address)) && port >= 1 && port <= 65535;
            } else if (simpleIpRegex.test(configToValidate.proxyIP)) {
                // 检查纯IP或域名格式（无端口）
                const address = configToValidate.proxyIP;

                // IPv4验证
                const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
                // 域名验证
                const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

                isValid = ipv4Regex.test(address) || domainRegex.test(address);
            }

            if (!isValid) {
                errors.push('代理IP格式无效，应为 IP、域名、IP:端口、域名:端口 或 [IPv6]:端口');
            }
        }

        // 检查订阅路径
        if (configToValidate.subPath) {
            if (!/^[a-zA-Z0-9_-]+$/.test(configToValidate.subPath)) {
                errors.push('订阅路径只能包含字母、数字、下划线和连字符');
            }
        }

        // 检查密码长度 - 已移除，使用MiSub的密码保护

        // 检查协议选择
        if (configToValidate.enabled && !configToValidate.enableVLESS && !configToValidate.enableTrojan) {
            errors.push('启用代理服务时至少需要选择一种协议');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    return {
        // 状态
        proxyConfig,
        proxyServiceStatus,
        isLoading,
        isSaving,
        lastError,
        lastTestResult,

        // 计算属性
        isProxyEnabled,
        proxySubscriptionUrl,
        hasValidConfig,
        enabledProtocols,

        // 方法
        fetchProxyConfig,
        saveProxyConfig,
        testProxyConfig,
        resetToDefaults,
        fetchProxyStatus,
        toggleProxyService,
        updateConfigField,
        updateConfig,
        resetConfig,
        clearError,
        clearTestResult,
        validateConfig
    };
});