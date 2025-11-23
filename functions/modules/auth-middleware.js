/**
 * 认证中间件模块
 * 处理用户认证和会话管理
 */

const COOKIE_NAME = 'auth_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8小时

/**
 * 创建HMAC签名的令牌
 * @param {string} key - 签名密钥
 * @param {string} data - 要签名的数据
 * @returns {Promise<string>} 签名后的令牌
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
 * 验证HMAC签名令牌
 * @param {string} key - 验证密钥
 * @param {string} token - 要验证的令牌
 * @returns {Promise<string|null>} 验证成功返回数据，失败返回null
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
 * @returns {Promise<boolean>} 是否认证通过
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
 * 处理用户登录
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - Cloudflare环境对象
 * @returns {Promise<Response>} 登录响应
 */
export async function handleLogin(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { password } = await request.json();
        if (password === env.ADMIN_PASSWORD) {
            const token = await createSignedToken(env.COOKIE_SECRET, String(Date.now()));
            const headers = new Headers({ 'Content-Type': 'application/json' });
            headers.append('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DURATION / 1000}`);
            return new Response(JSON.stringify({ success: true }), { headers });
        }
        return new Response(JSON.stringify({ error: '密码错误' }), { status: 401 });
    } catch (e) {
        console.error('[API Error /login]', e);
        return new Response(JSON.stringify({ error: '请求体解析失败' }), { status: 400 });
    }
}

/**
 * 处理用户登出
 * @returns {Promise<Response>} 登出响应
 */
export async function handleLogout() {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    headers.append('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
    return new Response(JSON.stringify({ success: true }), { headers });
}

/**
 * 获取认证失败的响应
 * @param {string} message - 错误消息
 * @returns {Response} 401响应
 */
export function createUnauthorizedResponse(message = 'Unauthorized') {
    return new Response(JSON.stringify({ error: message }), { status: 401 });
}