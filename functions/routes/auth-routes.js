/**
 * 认证路由
 * @author MiSub Team
 */

import { createAuthResponse, createLogoutResponse, createJsonResponse } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';

/**
 * 处理登录请求
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<Response>} - 登录响应
 */
export async function handleLogin(request, env) {
    if (request.method !== 'POST') {
        return createJsonResponse({ error: 'Method Not Allowed' }, 405);
    }

    try {
        const { password } = await request.json();
        if (password === env.ADMIN_PASSWORD) {
            return await createAuthResponse(env, { success: true });
        }
        return createJsonResponse({ error: '密码错误' }, 401);
    } catch (e) {
        console.error('[API Error /login]', e);
        return createJsonResponse({ error: '请求体解析失败' }, 400);
    }
}

/**
 * 处理登出请求
 * @param {Request} request - HTTP请求对象
 * @returns {Promise<Response>} - 登出响应
 */
export async function handleLogout(request) {
    return createLogoutResponse({ success: true });
}

/**
 * 验证认证中间件
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<Response|null>} - 如果未认证返回响应，否则返回null
 */
export async function requireAuth(request, env) {
    if (!await authMiddleware(request, env)) {
        return createJsonResponse({ error: 'Unauthorized' }, 401);
    }
    return null;
}