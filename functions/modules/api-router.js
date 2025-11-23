/**
 * API路由处理模块
 * 处理所有API请求的路由分发
 */

import { StorageFactory, DataMigrator } from '../storage-adapter.js';
import { createJsonResponse } from './utils.js';
import { authMiddleware, handleLogin, handleLogout } from './auth-middleware.js';
import { handleDataRequest, handleMisubsSave, handleSettingsGet, handleSettingsSave } from './api-handler.js';
import { handleCronTrigger } from './notifications.js';
import {
    handleSubscriptionNodesRequest
} from './handlers/subscription-handler.js';
import {
    handleDebugSubscriptionRequest,
    handleSystemInfoRequest,
    handleStorageTestRequest,
    handleExportDataRequest,
    handlePreviewContentRequest
} from './handlers/debug-handler.js';
import {
    handleNodeCountRequest as handleLegacyNodeCountRequest,
    handleBatchUpdateNodesRequest,
    handleCleanNodesRequest,
    handleHealthCheckRequest
} from './handlers/node-handler.js';

// 常量定义
const OLD_KV_KEY = 'misub_data_v1';
const KV_KEY_SUBS = 'misub_subscriptions_v1';

/**
 * 处理主要的API请求
 * @param {Object} request - HTTP请求对象
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<Response>} HTTP响应
 */
export async function handleApiRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api/, '');

    // [新增] 数据存储迁移接口 (KV -> D1)
    if (path === '/migrate_to_d1') {
        if (!await authMiddleware(request, env)) {
            return createJsonResponse({ error: 'Unauthorized' }, 401);
        }
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

    // [新增] 安全的、可重复执行的迁移接口
    if (path === '/migrate') {
        if (!await authMiddleware(request, env)) {
            return createJsonResponse({ error: 'Unauthorized' }, 401);
        }
        try {
            const oldData = await env.MISUB_KV.get(OLD_KV_KEY, 'json');
            const newDataExists = await env.MISUB_KV.get(KV_KEY_SUBS) !== null;

            if (newDataExists) {
                return createJsonResponse({ success: true, message: '无需迁移，数据已是最新结构。' }, 200);
            }
            if (!oldData) {
                return createJsonResponse({ success: false, message: '未找到需要迁移的旧数据。' }, 404);
            }

            await env.MISUB_KV.put(KV_KEY_SUBS, JSON.stringify(oldData));
            await env.MISUB_KV.put(KV_KEY_PROFILES, JSON.stringify([]));
            await env.MISUB_KV.put(OLD_KV_KEY + '_migrated_on_' + new Date().toISOString(), JSON.stringify(oldData));
            await env.MISUB_KV.delete(OLD_KV_KEY);

            return createJsonResponse({ success: true, message: '数据迁移成功！' }, 200);
        } catch (e) {
            console.error('[API Error /migrate]', e);
            return createJsonResponse({ success: false, message: `迁移失败: ${e.message}` }, 500);
        }
    }

    if (path === '/login') {
        return await handleLogin(request, env);
    }

    if (!await authMiddleware(request, env)) {
        return createJsonResponse({ error: 'Unauthorized' }, 401);
    }

    switch (path) {
        case '/logout':
            return await handleLogout();

        case '/data':
            return await handleDataRequest(env);

        case '/misubs':
            return await handleMisubsSave(request, env);

        case '/node_count':
            return await handleLegacyNodeCountRequest(request, env);

        case '/nodes/health':
            return await handleHealthCheckRequest(request, env);

        case '/nodes/clean':
            return await handleCleanNodesRequest(request, env);

        case '/fetch_external_url':
            return await handleExternalFetchRequest(request);

        case '/batch_update_nodes':
            return await handleBatchUpdateNodesRequest(request, env);

        case '/subscription_nodes':
            return await handleSubscriptionNodesRequest(request, env);

        case '/debug_subscription':
            return await handleDebugSubscriptionRequest(request, env);

        case '/system/info':
            return await handleSystemInfoRequest(request, env);

        case '/system/storage_test':
            return await handleStorageTestRequest(request, env);

        case '/system/export':
            return await handleExportDataRequest(request, env);

        case '/preview/content':
            return await handlePreviewContentRequest(request, env);

        case '/settings':
            if (request.method === 'GET') {
                return await handleSettingsGet(env);
            }
            if (request.method === 'POST') {
                return await handleSettingsSave(request, env);
            }
            return createJsonResponse('Method Not Allowed', 405);

        default:
            return createJsonResponse('API route not found', 404);
    }
}

/**
 * 处理外部URL获取请求
 * @param {Object} request - HTTP请求对象
 * @returns {Promise<Response>} HTTP响应
 */
async function handleExternalFetchRequest(request) {
    if (request.method !== 'POST') {
        return createJsonResponse('Method Not Allowed', 405);
    }
    const { url: externalUrl } = await request.json();
    if (!externalUrl || typeof externalUrl !== 'string' || !/^https?:\/\//.test(externalUrl)) {
        return createJsonResponse({ error: 'Invalid or missing url' }, 400);
    }

    try {
        const response = await fetch(new Request(externalUrl, {
            headers: { 'User-Agent': 'v2rayN/7.23' }, // 统一User-Agent
            redirect: "follow",
            cf: { insecureSkipVerify: true } // Allow insecure SSL for flexibility
        }));

        if (!response.ok) {
            return createJsonResponse({ error: `Failed to fetch external URL: ${response.status} ${response.statusText}` }, response.status);
        }

        const content = await response.text();
        return new Response(content, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

    } catch (e) {
        return createJsonResponse({ error: `Failed to fetch external URL: ${e.message}` }, 500);
    }
}