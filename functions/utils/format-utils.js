/**
 * 格式化工具函数
 * @author MiSub Team
 */

/**
 * 修复Clash配置中的WireGuard问题
 * @param {string} content - Clash配置内容
 * @returns {string} - 修复后的配置内容
 */
export function clashFix(content) {
    if (content.includes('wireguard') && !content.includes('remote-dns-resolve')) {
        let lines;
        if (content.includes('\r\n')) {
            lines = content.split('\r\n');
        } else {
            lines = content.split('\n');
        }

        let result = "";
        for (let line of lines) {
            if (line.includes('type: wireguard')) {
                const 备改内容 = `, mtu: 1280, udp: true`;
                const 正确内容 = `, mtu: 1280, remote-dns-resolve: true, udp: true`;
                result += line.replace(new RegExp(备改内容, 'g'), 正确内容) + '\n';
            } else {
                result += line + '\n';
            }
        }
        return result;
    }
    return content;
}

/**
 * 检测字符串是否为有效的Base64格式
 * @param {string} str - 要检测的字符串
 * @returns {boolean} - 是否为有效Base64
 */
export function isValidBase64(str) {
    // 先移除所有空白字符(空格、换行、回车等)
    const cleanStr = str.replace(/\s/g, '');
    const base64Regex = /^[A-Za-z0-9+\/=]+$/;
    return base64Regex.test(cleanStr) && cleanStr.length > 20;
}

/**
 * 根据客户端类型确定合适的用户代理
 * 参考CF-Workers-SUB的优雅策略：统一使用v2rayN UA获取订阅，简单而有效
 * @param {string} originalUserAgent - 原始用户代理字符串
 * @param {string} url - 请求URL（可选）
 * @returns {string} - 处理后的用户代理字符串
 */
export function getProcessedUserAgent(originalUserAgent, url = '') {
    if (!originalUserAgent) return originalUserAgent;

    // CF-Workers-SUB的精华策略：
    // 统一使用v2rayN UA获取订阅，绕过机场过滤同时保证获取完整节点
    // 不需要复杂的客户端判断，简单而有效
    return 'v2rayN/7.23';
}

/**
 * 根据User Agent确定客户端格式
 * @param {string} userAgentHeader - User-Agent头部
 * @returns {string} - 对应的格式
 */
export function determineFormatByUserAgent(userAgentHeader) {
    const ua = userAgentHeader.toLowerCase();
    // 使用陣列來保證比對的優先順序
    const uaMapping = [
        // Mihomo/Meta 核心的客戶端 - 需要clash格式
        ['flyclash', 'clash'],
        ['mihomo', 'clash'],
        ['clash.meta', 'clash'],
        ['clash-verge', 'clash'],
        ['meta', 'clash'],

        // 其他客戶端
        ['stash', 'clash'],
        ['nekoray', 'clash'],
        ['sing-box', 'singbox'],
        ['shadowrocket', 'base64'],
        ['v2rayn', 'base64'],
        ['v2rayng', 'base64'],
        ['surge', 'surge'],
        ['loon', 'loon'],
        ['quantumult%20x', 'quanx'],
        ['quantumult', 'quanx'],

        // 最後才匹配通用的 clash，作為向下相容
        ['clash', 'clash']
    ];

    for (const [keyword, format] of uaMapping) {
        if (ua.includes(keyword)) {
            return format;
        }
    }
    return 'base64';
}

/**
 * 从URL参数中确定目标格式
 * @param {URL} url - URL对象
 * @returns {string|null} - 目标格式
 */
export function determineFormatByUrl(url) {
    let targetFormat = url.searchParams.get('target');
    if (!targetFormat) {
        const supportedFormats = ['clash', 'singbox', 'surge', 'loon', 'base64', 'v2ray', 'trojan'];
        for (const format of supportedFormats) {
            if (url.searchParams.has(format)) {
                if (format === 'v2ray' || format === 'trojan') {
                    targetFormat = 'base64';
                } else {
                    targetFormat = format;
                }
                break;
            }
        }
    }
    return targetFormat;
}