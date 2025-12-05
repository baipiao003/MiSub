/**
 * 路由中心
 * @author MiSub Team
 */

import { StorageFactory, DataMigrator } from '../storage-adapter.js';
import { NODE_PROTOCOL_REGEX, extractProtocolFromNodeUrl, extractRegionFromNodeName, extractNodeNameFromUrl } from '../utils/node-utils.js';
import { sendTgNotification } from '../services/notification-service.js';
import { handleLogin, handleLogout, requireAuth } from './auth-routes.js';
import { createJsonResponse } from '../middleware/auth.js';

// 常量定义
const OLD_KV_KEY = 'misub_data_v1';
const KV_KEY_SUBS = 'misub_subscriptions_v1';
const KV_KEY_PROFILES = 'misub_profiles_v1';
const KV_KEY_SETTINGS = 'worker_settings_v1';
const defaultSettings = {
    FileName: 'MiSub',
    mytoken: 'auto',
    profileToken: 'profiles',
    subConverter: 'url.v1.mk',
    subConfig: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/refs/heads/main/Clash/config/ACL4SSR_Online_Full.ini',
    prependSubName: true,
    prefixConfig: {
        enableManualNodes: true,
        enableSubscriptions: true,
        manualNodePrefix: '手动节点',
        enableNodeEmoji: true
    },
    NotifyThresholdDays: 3,
    NotifyThresholdPercent: 90,
    storageType: 'kv'
};

/**
 * 获取存储适配器实例
 * @param {Object} env - Cloudflare 环境对象
 * @returns {Promise<Object>} 存储适配器实例
 */
async function getStorageAdapter(env) {
    const storageType = await StorageFactory.getStorageType(env);
    return StorageFactory.createAdapter(env, storageType);
}

/**
 * 处理数据获取请求
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<Response>} - 数据响应
 */
export async function handleDataRequest(env) {
    try {
        const storageAdapter = await getStorageAdapter(env);
        const [misubs, profiles, settings] = await Promise.all([
            storageAdapter.get(KV_KEY_SUBS).then(res => res || []),
            storageAdapter.get(KV_KEY_PROFILES).then(res => res || []),
            storageAdapter.get(KV_KEY_SETTINGS).then(res => res || {})
        ]);
        const config = {
            FileName: settings.FileName || 'MISUB',
            mytoken: settings.mytoken || 'auto',
            profileToken: settings.profileToken || 'profiles'
        };
        return createJsonResponse({ misubs, profiles, config }, 200, new Headers(), {
            cacheable: true,
            maxAge: 300 // 缓存5分钟，因为这是频繁访问的初始数据
        });
    } catch (e) {
        console.error('[API Error /data]', 'Failed to read from storage:', e);
        return createJsonResponse({ error: '读取初始数据失败' }, 500);
    }
}

/**
 * 处理订阅数据保存请求
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<Response>} - 保存响应
 */
export async function handleMisubsSave(request, env) {
    try {
        // 步骤1: 解析请求体
        let requestData;
        try {
            requestData = await request.json();
        } catch (parseError) {
            console.error('[API Error /misubs] JSON解析失败:', parseError);
            return createJsonResponse({
                success: false,
                message: '请求数据格式错误，请检查数据格式'
            }, 400);
        }

        const { misubs, profiles } = requestData;

        // 步骤2: 验证必需字段
        if (typeof misubs === 'undefined' || typeof profiles === 'undefined') {
            return createJsonResponse({
                success: false,
                message: '请求体中缺少 misubs 或 profiles 字段'
            }, 400);
        }

        // 步骤3: 验证数据类型
        if (!Array.isArray(misubs) || !Array.isArray(profiles)) {
            return createJsonResponse({
                success: false,
                message: 'misubs 和 profiles 必须是数组格式'
            }, 400);
        }

        // 步骤4: 获取设置（带错误处理）
        let settings;
        try {
            const storageAdapter = await getStorageAdapter(env);
            settings = await storageAdapter.get(KV_KEY_SETTINGS) || defaultSettings;
        } catch (settingsError) {
            settings = defaultSettings;
        }

        // 步骤5: 处理通知（非阻塞，错误不影响保存）
        try {
            const notificationPromises = misubs
                .filter(sub => sub && sub.url && sub.url.startsWith('http'))
                .map(sub => checkAndNotify(sub, settings, env).catch(() => {
                    // 通知失败不影响保存流程
                }));

            // 并行处理通知，但不等待完成
            Promise.all(notificationPromises).catch(() => {
                // 部分通知处理失败
            });
        } catch (notificationError) {
            // 通知系统错误，继续保存流程
        }

        // 步骤6: 保存数据到存储
        try {
            const storageAdapter = await getStorageAdapter(env);
            await Promise.all([
                storageAdapter.put(KV_KEY_SUBS, misubs),
                storageAdapter.put(KV_KEY_PROFILES, profiles)
            ]);
        } catch (storageError) {
            return createJsonResponse({
                success: false,
                message: `数据保存失败: ${storageError.message || '存储服务暂时不可用，请稍后重试'}`
            }, 500);
        }

        return createJsonResponse({
            success: true,
            message: '订阅源及订阅组已保存'
        });

    } catch (e) {
        return createJsonResponse({
            success: false,
            message: `保存失败: ${e.message || '服务器内部错误，请稍后重试'}`
        }, 500);
    }
}

/**
 * 检查并发送通知
 * @param {Object} sub - 订阅对象
 * @param {Object} settings - 设置对象
 * @param {Object} env - Cloudflare环境对象
 */
async function checkAndNotify(sub, settings, env) {
    if (!sub.userInfo) return;

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();

    // 1. 检查订阅到期
    if (sub.userInfo.expire) {
        const expiryDate = new Date(sub.userInfo.expire * 1000);
        const daysRemaining = Math.ceil((expiryDate - now) / ONE_DAY_MS);

        if (daysRemaining <= (settings.NotifyThresholdDays || 7)) {
            if (!sub.lastNotifiedExpire || (now - sub.lastNotifiedExpire > ONE_DAY_MS)) {
                const message = `🗓️ *订阅临期提醒* 🗓️

*订阅名称:* \`${sub.name || '未命名'}\`
*状态:* \`${daysRemaining < 0 ? '已过期' : `仅剩 ${daysRemaining} 天到期`}\`
*到期日期:* \`${expiryDate.toLocaleDateString('zh-CN')}\``;
                const sent = await sendTgNotification(settings, message);
                if (sent) {
                    sub.lastNotifiedExpire = now;
                }
            }
        }
    }

    // 2. 检查流量使用
    const { upload, download, total } = sub.userInfo;
    if (total > 0) {
        const used = upload + download;
        const usagePercent = Math.round((used / total) * 100);

        if (usagePercent >= (settings.NotifyThresholdPercent || 90)) {
            if (!sub.lastNotifiedTraffic || (now - sub.lastNotifiedTraffic > ONE_DAY_MS)) {
                const formatBytes = (bytes) => {
                    if (!+bytes) return '0 B';
                    const k = 1024;
                    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
                };

                const message = `📈 *流量预警提醒* 📈

*订阅名称:* \`${sub.name || '未命名'}\`
*状态:* \`已使用 ${usagePercent}%\`
*详情:* \`${formatBytes(used)} / ${formatBytes(total)}\``;
                const sent = await sendTgNotification(settings, message);
                if (sent) {
                    sub.lastNotifiedTraffic = now;
                }
            }
        }
    }
}

/**
 * 处理设置相关请求
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<Response>} - 设置响应
 */
export async function handleSettingsRequest(request, env) {
    if (request.method === 'GET') {
        try {
            const storageAdapter = await getStorageAdapter(env);
            const settings = await storageAdapter.get(KV_KEY_SETTINGS) || {};
            return createJsonResponse({ ...defaultSettings, ...settings }, 200, new Headers(), {
                cacheable: true,
                maxAge: 600 // 缓存10分钟，配置数据不常变化
            });
        } catch (e) {
            return createJsonResponse({ error: '读取设置失败' }, 500);
        }
    }

    if (request.method === 'POST') {
        try {
            const newSettings = await request.json();
            const storageAdapter = await getStorageAdapter(env);
            const oldSettings = await storageAdapter.get(KV_KEY_SETTINGS) || {};
            const finalSettings = { ...oldSettings, ...newSettings };

            await storageAdapter.put(KV_KEY_SETTINGS, finalSettings);

            const message = `⚙️ *MiSub 设置更新* ⚙️\n\n您的 MiSub 应用设置已成功更新。`;
            await sendTgNotification(finalSettings, message);

            return createJsonResponse({ success: true, message: '设置已保存' });
        } catch (e) {
            return createJsonResponse({ error: '保存设置失败' }, 500);
        }
    }

    return createJsonResponse({ error: 'Method Not Allowed' }, 405);
}