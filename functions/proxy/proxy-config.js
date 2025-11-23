/**
 * 代理配置管理模块
 * 负责代理配置的存储、读取和验证
 * 使用与MiSub相同的KV存储系统
 */

// 默认代理配置 - 初始为空
export const defaultProxyConfig = {
    enabled: false,
    enableVLESS: true,        // VLESS 默认启用，但UI中不显示开关
    enableTrojan: false,      // Trojan 默认关闭
    uuid: '',                 // UUID 初始为空
    proxyIP: '',              // 代理IP 初始为空
    subPath: 'link',          // 订阅路径有默认值
    cfipList: []              // 优选IP列表初始为空
};

/**
 * 代理配置管理类 - 使用KV存储
 */
export class ProxyConfigManager {
    constructor(env) {
        this.env = env;
        // 使用MiSub的KV存储
        this.storageKey = 'misub_proxy_config_v1';
    }

    /**
     * 获取代理配置
     */
    async getConfig() {
        try {
            const config = await this.env.MISUB_KV.get(this.storageKey, 'json');
            if (config) {
                // 合并默认配置，确保所有字段都存在
                return { ...defaultProxyConfig, ...config };
            }
            return defaultProxyConfig;
        } catch (error) {
            console.error('获取代理配置失败:', error);
            return defaultProxyConfig;
        }
    }

    /**
     * 保存代理配置
     */
    async saveConfig(config) {
        try {
            // 验证配置
            const validationResult = this.validateConfig(config);
            if (!validationResult.valid) {
                throw new Error(`配置验证失败: ${validationResult.errors.join(', ')}`);
            }

            // 清理和标准化配置
            const cleanConfig = this.normalizeConfig(config);

            // 保存到KV
            await this.env.MISUB_KV.put(this.storageKey, JSON.stringify(cleanConfig));
            return { success: true, config: cleanConfig };
        } catch (error) {
            console.error('保存代理配置失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 重置为默认配置
     */
    async resetToDefaults() {
        try {
            await this.env.MISUB_KV.put(this.storageKey, JSON.stringify(defaultProxyConfig));
            return { success: true, config: defaultProxyConfig };
        } catch (error) {
            console.error('重置代理配置失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 验证代理配置
     */
    validateConfig(config) {
        const errors = [];

        // 检查UUID格式（如果不为空）
        if (config.uuid && !this.isValidUUID(config.uuid)) {
            errors.push('UUID格式无效');
        }

        // 检查代理IP格式（如果不为空）
        if (config.proxyIP && !this.isValidProxyIP(config.proxyIP)) {
            errors.push('代理IP格式无效');
        }

        // 检查订阅路径
        if (config.subPath && !this.isValidPath(config.subPath)) {
            errors.push('订阅路径格式无效');
        }

        // 检查优选IP列表
        if (config.cfipList && Array.isArray(config.cfipList)) {
            const invalidIPs = config.cfipList.filter(ip => !this.isValidCfipItem(ip));
            if (invalidIPs.length > 0) {
                errors.push(`优选IP列表格式无效: ${invalidIPs.slice(0, 3).join(', ')}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 标准化配置
     */
    normalizeConfig(config) {
        const normalized = { ...defaultProxyConfig, ...config };

        // 确保布尔值
        normalized.enabled = Boolean(normalized.enabled);
        normalized.enableVLESS = Boolean(normalized.enableVLESS);
        normalized.enableTrojan = Boolean(normalized.enableTrojan);

        // 清理UUID
        if (normalized.uuid) {
            normalized.uuid = normalized.uuid.trim();
        }

        // 清理代理IP
        if (normalized.proxyIP) {
            normalized.proxyIP = normalized.proxyIP.trim();
        }

        // 清理订阅路径
        if (normalized.subPath) {
            normalized.subPath = normalized.subPath.trim().replace(/[^a-zA-Z0-9_-]/g, '');
        }

        // 清理优选IP列表
        if (Array.isArray(normalized.cfipList)) {
            normalized.cfipList = normalized.cfipList
                .filter(ip => ip && ip.trim())
                .map(ip => ip.trim())
                .filter(ip => this.isValidCfipItem(ip));
        }

        return normalized;
    }

    /**
     * 验证UUID格式
     */
    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    /**
     * 验证代理IP格式
     * 支持IPv4、域名和IPv6格式，端口可选
     */
    isValidProxyIP(proxyIP) {
        // 支持格式:
        // - IP (无端口): 192.168.1.1, google.com, [2001:db8::1]
        // - IP:端口: 192.168.1.1:8080, google.com:443, [2001:db8::1]:443

        // IPv6格式 (带或不带端口)
        const ipv6WithPortRegex = /^\[([0-9a-fA-F:]+)\]:(\d{1,5})$/;
        const ipv6WithoutPortRegex = /^\[([0-9a-fA-F:]+)\]$/;

        // IPv4或域名格式 (带或不带端口)
        const ipPortRegex = /^([^:]+):(\d{1,5})$/;
        const simpleIpRegex = /^([^:]+)$/;

        // 检查IPv6格式
        if (ipv6WithPortRegex.test(proxyIP)) {
            const match = proxyIP.match(ipv6WithPortRegex);
            const ipv6 = match[1];
            const port = parseInt(match[2]);
            return this.isValidIPv6(ipv6) && port >= 1 && port <= 65535;
        } else if (ipv6WithoutPortRegex.test(proxyIP)) {
            const match = proxyIP.match(ipv6WithoutPortRegex);
            const ipv6 = match[1];
            return this.isValidIPv6(ipv6);
        } else if (ipPortRegex.test(proxyIP)) {
            // 检查IP:端口或域名:端口格式
            const match = proxyIP.match(ipPortRegex);
            const address = match[1];
            const port = parseInt(match[2]);

            return (this.isValidIPv4(address) || this.isValidDomain(address)) && port >= 1 && port <= 65535;
        } else if (simpleIpRegex.test(proxyIP)) {
            // 检查纯IP或域名格式（无端口）
            const address = proxyIP;
            return this.isValidIPv4(address) || this.isValidDomain(address);
        }

        return false;
    }

    /**
     * 验证路径格式
     */
    isValidPath(path) {
        // 只允许字母、数字、下划线、连字符
        return /^[a-zA-Z0-9_-]+$/.test(path) && path.length > 0;
    }

    /**
     * 验证优选IP条目格式
     * 支持多种格式：
     * - IP 或 IP:端口
     * - 域名 或 域名:端口
     * - [IPv6] 或 [IPv6]:端口
     * - 以上任何格式都可以带 #备注
     */
    isValidCfipItem(item) {
        if (!item || typeof item !== 'string') return false;

        const trimmed = item.trim();
        if (!trimmed) return false;

        // 分离地址和备注部分
        const cfipRegex = /^([^#]+)(?:#(.*))?$/;
        if (!cfipRegex.test(trimmed)) return false;

        const match = trimmed.match(cfipRegex);
        const addressPart = match[1]; // 地址部分（可能包含端口）
        // 备注 = match[2]; // 备注部分，不需要验证

        // 使用代理IP验证函数来验证地址部分
        return this.isValidProxyIP(addressPart);
    }

    /**
     * 验证IPv4地址
     */
    isValidIPv4(ip) {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipv4Regex.test(ip);
    }

    /**
     * 验证IPv6地址
     */
    isValidIPv6(ip) {
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
        return ipv6Regex.test(ip);
    }

    /**
     * 验证域名
     */
    isValidDomain(domain) {
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return domainRegex.test(domain) && domain.length <= 253;
    }

    /**
     * 测试代理配置
     */
    async testConfig(config) {
        try {
            // 基本验证
            const validation = this.validateConfig(config);
            if (!validation.valid) {
                return {
                    success: false,
                    error: `配置验证失败: ${validation.errors.join(', ')}`
                };
            }

            // 这里可以添加实际的连通性测试
            // 目前只进行基本的格式验证
            return {
                success: true,
                message: '配置验证通过'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

/**
 * 创建代理配置管理器实例
 */
export function createProxyConfigManager(env) {
    return new ProxyConfigManager(env);
}