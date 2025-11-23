/**
 * CORS中间件
 * @author MiSub Team
 */

/**
 * CORS中间件 - 处理跨域请求
 * @param {Request} request - HTTP请求对象
 * @param {Function} next - 下一个处理函数
 * @param {Object} options - CORS配置选项
 * @returns {Promise<Response>} - 处理后的响应
 */
export async function corsMiddleware(request, next, options = {}) {
    const {
        origins = ['*'],
        methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        headers = ['Content-Type', 'Authorization', 'X-Requested-With'],
        maxAge = 86400 // 24小时
    } = options;

    const origin = request.headers.get('Origin');
    const method = request.headers.get('Access-Control-Request-Method');
    const headersRequest = request.headers.get('Access-Control-Request-Headers');

    // 处理预检请求
    if (request.method === 'OPTIONS') {
        const response = new Response(null, { status: 204 });

        // 设置允许的源
        if (origins.includes('*') || (origin && origins.includes(origin))) {
            response.headers.set('Access-Control-Allow-Origin', origin || '*');
        }

        response.headers.set('Access-Control-Allow-Methods', methods.join(', '));
        response.headers.set('Access-Control-Allow-Headers', headers.join(', '));
        response.headers.set('Access-Control-Max-Age', maxAge.toString());

        return response;
    }

    // 处理实际请求
    const response = await next();

    // 添加CORS头部
    if (origins.includes('*') || (origin && origins.includes(origin))) {
        response.headers.set('Access-Control-Allow-Origin', origin || '*');
        response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    response.headers.set('Access-Control-Expose-Headers', headers.join(', '));

    return response;
}

/**
 * 安全头部中间件
 * @param {Request} request - HTTP请求对象
 * @param {Function} next - 下一个处理函数
 * @returns {Promise<Response>} - 处理后的响应
 */
export async function securityHeadersMiddleware(request, next) {
    const response = await next();

    // 设置安全相关的HTTP头部
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    return response;
}