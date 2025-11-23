/**
 * 认证中间件
 * @author MiSub Team
 */

const COOKIE_NAME = 'auth_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8小时

/**
 * 创建签名的HMAC令牌
 * @param {string} key - 密钥
 * @param {string} data - 要签名数据
 * @returns {Promise<string>} - 签名后的令牌
 */
export async function createSignedToken(key, data) {
    if (!key || !data) throw new Error("Key and data are required for signing.");
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const dataToSign = encoder.encode(data);
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataToSign);
    return `${data}.${Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * 验证签名的HMAC令牌
 * @param {string} key - 密钥
 * @param {string} token - 令牌
 * @returns {Promise<string|null>} - 验证通过返回数据，否则返回null
 */
export async function verifySignedToken(key, token) {
    if (!key || !token) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [data] = parts;
    const expectedToken = await createSignedToken(key, data);
    return token === expectedToken ? data : null;
}

/**
 * 认证中间件 - 检查用户是否已登录
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<boolean>} - 是否已认证
 */
export async function authMiddleware(request, env) {
    if (!env.COOKIE_SECRET) return false;
    const cookie = request.headers.get('Cookie');
    const sessionCookie = cookie?.split(';').find(c => c.trim().startsWith(`${COOKIE_NAME}=`));
    if (!sessionCookie) return false;
    const token = sessionCookie.split('=')[1];
    const verifiedData = await verifySignedToken(env.COOKIE_SECRET, token);
    return verifiedData && (Date.now() - parseInt(verifiedData, 10) < SESSION_DURATION);
}

/**
 * 创建认证成功后的响应
 * @param {Object} env - Cloudflare环境对象
 * @param {Object} data - 响应数据
 * @returns {Promise<Response>} - 包含认证cookie的响应
 */
export async function createAuthResponse(env, data) {
    const token = await createSignedToken(env.COOKIE_SECRET, String(Date.now()));
    const headers = new Headers({ 'Content-Type': 'application/json' });
    headers.append('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DURATION / 1000}`);
    return new Response(JSON.stringify(data), { headers });
}

/**
 * 创建登出响应
 * @param {Object} data - 响应数据
 * @returns {Response} - 清除认证cookie的响应
 */
export function createLogoutResponse(data) {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    headers.append('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
    return new Response(JSON.stringify(data), { headers });
}

/**
 * 创建JSON响应
 * @param {Object} data - 响应数据
 * @param {number} status - HTTP状态码
 * @param {Headers} headers - 额外的响应头
 * @param {Object} options - 缓存选项
 * @returns {Response} - JSON响应
 */
export function createJsonResponse(data, status = 200, headers = new Headers(), options = {}) {
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    // 添加缓存优化头部
    const { cacheable = false, maxAge = 0 } = options;

    if (cacheable && status === 200) {
        // 成功响应且可缓存时添加缓存头
        headers.set('Cache-Control', `public, max-age=${maxAge}`);
        // 添加ETag用于客户端缓存验证
        const etag = generateETag(data);
        headers.set('ETag', etag);
    } else if (status >= 400) {
        // 错误响应不缓存
        headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
        // 默认短期缓存
        headers.set('Cache-Control', 'max-age=60');
    }

    return new Response(JSON.stringify(data), { status, headers });
}

/**
 * 生成数据的ETag
 * @param {any} data - 要生成ETag的数据
 * @returns {string} - ETag值
 */
function generateETag(data) {
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    const hash = simpleHash(jsonString);
    return `"${hash}"`;
}

/**
 * 简单哈希函数
 * @param {string} str - 要哈希的字符串
 * @returns {string} - 哈希值
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}