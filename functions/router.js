/**
 * 路由分发器
 * @author MiSub Team
 */

import { handleLogin, handleLogout, requireAuth } from './routes/auth-routes.js';
import { handleDataRequest, handleMisubsSave, handleSettingsRequest } from './routes/index.js';
import { createJsonResponse } from './middleware/auth.js';
import { DataMigrator, StorageFactory } from './storage-adapter.js';

/**
 * 主API请求处理器
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<Response>} - API响应
 */
export async function handleApiRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api/, '');

    // 数据迁移接口
    if (path === '/migrate_to_d1') {
        const authResult = await requireAuth(request, env);
        if (authResult) return authResult;

        try {
            if (!env.MISUB_DB) {
                return createJsonResponse({
                    success: false,
                    message: 'D1 数据库未配置，请检查 wrangler.toml 配置'
                }, 400);
            }

            const migrationResult = await DataMigrator.migrateKVToD1(env);

            if (migrationResult.errors.length > 0) {
                return createJsonResponse({
                    success: false,
                    message: '迁移过程中出现错误',
                    details: migrationResult.errors,
                    partialSuccess: migrationResult
                }, 500);
            }

            return createJsonResponse({
                success: true,
                message: '数据已成功迁移到 D1 数据库',
                details: migrationResult
            });

        } catch (error) {
            console.error('[API Error /migrate_to_d1]', error);
            return createJsonResponse({
                success: false,
                message: `迁移失败: ${error.message}`
            }, 500);
        }
    }

    // 向后兼容迁移接口
    if (path === '/migrate') {
        const authResult = await requireAuth(request, env);
        if (authResult) return authResult;

        try {
            const oldData = await env.MISUB_KV.get('misub_data_v1', 'json');
            const newDataExists = await env.MISUB_KV.get('misub_subscriptions_v1') !== null;

            if (newDataExists) {
                return createJsonResponse({ success: true, message: '无需迁移，数据已是最新结构。' });
            }
            if (!oldData) {
                return createJsonResponse({ success: false, message: '未找到需要迁移的旧数据。' }, 404);
            }

            await env.MISUB_KV.put('misub_subscriptions_v1', JSON.stringify(oldData));
            await env.MISUB_KV.put('misub_profiles_v1', JSON.stringify([]));
            await env.MISUB_KV.delete('misub_data_v1');

            return createJsonResponse({ success: true, message: '数据迁移成功！' });
        } catch (e) {
            console.error('[API Error /migrate]', e);
            return createJsonResponse({ success: false, message: `迁移失败: ${e.message}` }, 500);
        }
    }

    // 登录接口 - 不需要认证
    if (path === '/login') {
        return await handleLogin(request, env);
    }

    // 其他接口都需要认证
    const authResult = await requireAuth(request, env);
    if (authResult) return authResult;

    switch (path) {
        case '/logout':
            return await handleLogout(request);

        case '/data':
            return await handleDataRequest(env);

        case '/misubs':
            return await handleMisubsSave(request, env);

        case '/settings':
            return await handleSettingsRequest(request, env);

        default:
            return createJsonResponse({ error: 'API route not found' }, 404);
    }
}