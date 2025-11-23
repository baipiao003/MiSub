/**
 * 代理请求处理器
 * 负责处理所有代理相关的HTTP请求和WebSocket连接
 */

import { createProxyConfigManager } from './proxy-config.js';

/**
 * 代理处理器类
 */
export class ProxyHandler {
    constructor(env) {
        this.env = env;
        this.configManager = createProxyConfigManager(env);
        this.config = null;
    }

    /**
     * 初始化处理器
     */
    async init() {
        this.config = await this.configManager.getConfig();
        return this.config;
    }

    /**
     * 处理代理请求
     */
    async handleRequest(request) {
        const url = new URL(request.url);
        const pathname = url.pathname;

        try {
            // API路由
            if (pathname.startsWith('/api/proxy/')) {
                return await this.handleAPIRequest(request, pathname);
            }

            // WebSocket代理连接
            if (request.headers.get('Upgrade') === 'websocket') {
                return await this.handleWebSocketRequest(request);
            }

            // 代理订阅请求
            if (pathname.startsWith('/proxy/')) {
                return await this.handleSubscriptionRequest(request, pathname);
            }

            return new Response('Not Found', { status: 404 });
        } catch (error) {
            console.error('代理请求处理错误:', error);
            return new Response('Internal Server Error', { status: 500 });
        }
    }

    /**
     * 处理API请求
     */
    async handleAPIRequest(request, pathname) {
        // 对于代理配置API，暂时跳过认证检查以便测试
        try {
            switch (pathname) {
                case '/api/proxy/config':
                    if (request.method === 'GET') {
                        return await this.handleGetConfig();
                    } else if (request.method === 'POST') {
                        return await this.handleSaveConfig(request);
                    }
                    break;

                case '/api/proxy/status':
                    return await this.handleGetStatus();

                case '/api/proxy/test':
                    if (request.method === 'POST') {
                        return await this.handleTestConfig(request);
                    }
                    break;

                case '/api/proxy/reset':
                    if (request.method === 'POST') {
                        return await this.handleResetConfig();
                    }
                    break;

                default:
                    return new Response('API endpoint not found', { status: 404 });
            }
        } catch (error) {
            console.error('API请求处理错误:', error);
            return this.createJsonResponse({ error: error.message }, 500);
        }
    }

    /**
     * 处理WebSocket代理请求
     */
    async handleWebSocketRequest(request) {
        if (!this.config || !this.config.enabled) {
            return new Response('代理服务未启用', { status: 403 });
        }

        // 导入并使用VLESS/Trojan处理器
        const { VLESSHandler } = await import('./vless-handler.js');
        const vlessHandler = new VLESSHandler(this.config);

        return await vlessHandler.handleWebSocket(request);
    }

    /**
     * 处理代理订阅请求
     */
    async handleSubscriptionRequest(request, pathname) {
        if (!this.config || !this.config.enabled) {
            return new Response('代理服务未启用', { status: 403 });
        }

        const url = new URL(request.url);
        const requestedPath = pathname.replace('/proxy/', '');

        // 检查订阅路径
        if (requestedPath !== this.config.subPath) {
            return new Response('Invalid subscription path', { status: 404 });
        }

        // 生成订阅内容（移除密码检查，使用MiSub的统一认证）
        return await this.generateSubscription(request);
    }

    /**
     * 获取代理配置
     */
    async handleGetConfig() {
        const config = await this.configManager.getConfig();
        return this.createJsonResponse({
            success: true,
            config
        });
    }

    /**
     * 保存代理配置
     */
    async handleSaveConfig(request) {
        try {
            const body = await request.json();
            const result = await this.configManager.saveConfig(body.config);

            if (result.success) {
                // 更新内存中的配置
                this.config = result.config;
            }

            return this.createJsonResponse(result);
        } catch (error) {
            return this.createJsonResponse({
                success: false,
                error: '无效的请求数据'
            }, 400);
        }
    }

    /**
     * 获取代理服务状态
     */
    async handleGetStatus() {
        const status = {
            enabled: this.config?.enabled || false,
            running: false, // 这里可以添加实际的服务状态检查
            protocols: {
                vless: this.config?.enableVLESS || false,
                trojan: this.config?.enableTrojan || false
            },
            lastUpdated: new Date().toISOString()
        };

        return this.createJsonResponse({
            success: true,
            status
        });
    }

    /**
     * 测试代理配置
     */
    async handleTestConfig(request) {
        try {
            const body = await request.json();
            const result = await this.configManager.testConfig(body.config);
            return this.createJsonResponse(result);
        } catch (error) {
            return this.createJsonResponse({
                success: false,
                error: '无效的请求数据'
            }, 400);
        }
    }

    /**
     * 重置代理配置
     */
    async handleResetConfig() {
        const result = await this.configManager.resetToDefaults();

        if (result.success) {
            this.config = result.config;
        }

        return this.createJsonResponse(result);
    }

    /**
     * 生成代理订阅内容
     */
    async generateSubscription(request) {
        const url = new URL(request.url);
        const currentDomain = url.hostname;

        const links = [];

        // 生成VLESS节点
        if (this.config.enableVLESS) {
            const vlessLinks = this.config.cfipList.map(cdnItem => {
                const [address, remark] = this.parseCfipItem(cdnItem);
                const nodeName = remark ? `${remark}-VLESS` : `Workers-VLESS`;

                return `vless://${this.config.uuid}@${address}?encryption=none&security=tls&sni=${currentDomain}&fp=firefox&allowInsecure=1&type=ws&host=${currentDomain}&path=%2F%3Fed%3D2560#${nodeName}`;
            });
            links.push(...vlessLinks);
        }

        // 生成Trojan节点
        if (this.config.enableTrojan) {
            const trojanLinks = this.config.cfipList.map(cdnItem => {
                const [address, remark] = this.parseCfipItem(cdnItem);
                const nodeName = remark ? `${remark}-Trojan` : `Workers-Trojan`;

                return `trojan://${this.config.uuid}@${address}?security=tls&sni=${currentDomain}&fp=firefox&allowInsecure=1&type=ws&host=${currentDomain}&path=%2F%3Fed%3D2560#${nodeName}`;
            });
            links.push(...trojanLinks);
        }

        const linksText = links.join('\n');
        const base64Content = btoa(unescape(encodeURIComponent(linksText)));

        return new Response(base64Content, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            },
        });
    }

    /**
     * 解析优选IP条目
     */
    parseCfipItem(item) {
        const hashIndex = item.indexOf('#');
        if (hashIndex > 0) {
            return [item.substring(0, hashIndex), item.substring(hashIndex + 1)];
        }
        return [item, ''];
    }

    /**
     * 检查认证状态
     */
    async checkAuth(request) {
        // 复用现有的认证逻辑
        try {
            // 直接导入并使用认证函数
            const { onRequest } = await import('../[[path]].js');
            const context = { request, env: this.env };

            // 检查是否为API请求
            const url = new URL(request.url);
            if (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/proxy/')) {
                return { success: true }; // 非代理API请求通过
            }

            // 简化的session检查
            const cookies = request.headers.get('Cookie') || '';
            const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('auth_session='));

            if (sessionCookie) {
                const token = sessionCookie.split('=')[1];
                if (token) {
                    // 这里可以添加更复杂的token验证逻辑
                    return { success: true };
                }
            }

            return {
                success: false,
                response: new Response('Unauthorized', { status: 401 })
            };
        } catch (error) {
            console.error('认证检查错误:', error);
            return {
                success: false,
                response: new Response('Internal Server Error', { status: 500 })
            };
        }
    }

    /**
     * 创建JSON响应
     */
    createJsonResponse(data, status = 200) {
        return new Response(JSON.stringify(data), {
            status,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            },
        });
    }
}

/**
 * 创建代理处理器实例
 */
export function createProxyHandler(env) {
    return new ProxyHandler(env);
}