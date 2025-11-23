/**
 * MiSub Cloudflare Pages Functions - 主入口文件
 * 负责路由分发和请求协调
 *
 * 模块化架构v2:
 * - utils.js: 工具函数
 * - auth-middleware.js: 认证中间件
 * - notifications.js: 通知功能
 * - subscription.js: 订阅处理
 * - subscription-handler.js: 订阅请求处理
 * - api-handler.js: API处理
 * - api-router.js: API路由
 * - handlers/: 功能处理器模块
 *   - subscription-handler.js: 订阅相关处理
 *   - node-handler.js: 节点相关处理
 *   - debug-handler.js: 调试相关处理
 * - utils/: 工具模块
 *   - geo-utils.js: 地理识别工具
 *   - node-parser.js: 节点解析工具
 */

import { handleMisubRequest } from './modules/subscription-handler.js';
import { handleApiRequest } from './modules/api-router.js';
import { createJsonResponse } from './modules/utils.js';

/**
 * 主要的请求处理函数
 * @param {Object} context - Cloudflare上下文对象
 * @returns {Promise<Response>} HTTP响应
 */
export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);

    try {
        // 路由分发
        if (url.pathname.startsWith('/api/')) {
            // API 路由
            return await handleApiRequest(request, env);
        } else if (url.pathname.startsWith('/sub/')) {
            // MiSub 订阅路由
            return await handleMisubRequest(context);
        } else if (url.pathname === '/cron') {
            // 定时任务路由 (需要认证)
            const cronAuthHeader = request.headers.get('Authorization');
            if (cronAuthHeader !== `Bearer ${env.CRON_SECRET}`) {
                return createJsonResponse({ error: 'Unauthorized' }, 401);
            }

            const { handleCronTrigger } = await import('./modules/notifications.js');
            return await handleCronTrigger(env);
        } else {
            // 静态文件处理
            const isStaticAsset = /^\/(assets|@vite|src)\/./.test(url.pathname) || /\.\w+$/.test(url.pathname);
            if (!isStaticAsset && url.pathname !== '/') {
                return await handleMisubRequest(context);
            }
            // 继续处理静态文件或根路径
            return next();
        }
    } catch (error) {
        // 全局错误处理
        console.error('[Main Handler Error]', error);
        return createJsonResponse({
            error: 'Internal Server Error',
            message: error.message
        }, 500);
    }
}

/**
 * 调试信息导出 (仅开发环境)
 */
export const debugInfo = {
    version: '2.0.0-modular-v2',
    modules: [
        'utils',
        'auth-middleware',
        'notifications',
        'subscription',
        'subscription-handler',
        'api-handler',
        'api-router',
        'handlers/subscription-handler',
        'handlers/node-handler',
        'handlers/debug-handler',
        'utils/geo-utils',
        'utils/node-parser'
    ],
    architecture: 'modular-refactor-v2-domain-split'
};