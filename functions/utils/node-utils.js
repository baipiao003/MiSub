/**
 * 节点处理工具函数
 * @author MiSub Team
 */

/**
 * 地区关键词映射
 */
export const REGION_KEYWORDS = {
    '香港': ['HK', '香港', 'Hong Kong', 'HongKong'],
    '台湾': ['TW', '台湾', 'Taiwan', 'Taipei'],
    '新加坡': ['SG', '新加坡', 'Singapore'],
    '日本': ['JP', '日本', 'Japan', 'Tokyo', 'Osaka'],
    '美国': ['US', '美国', 'USA', 'United States', 'America'],
    '韩国': ['KR', '韩国', 'Korea', 'Seoul'],
    '英国': ['UK', '英国', 'Britain', 'London'],
    '德国': ['DE', '德国', 'Germany', 'Frankfurt'],
    '法国': ['FR', '法国', 'France', 'Paris'],
    '加拿大': ['CA', '加拿大', 'Canada'],
    '澳大利亚': ['AU', '澳大利亚', 'Australia'],
    '荷兰': ['NL', '荷兰', 'Netherlands', 'Amsterdam'],
    '俄罗斯': ['RU', '俄罗斯', 'Russia', 'Moscow'],
    '印度': ['IN', '印度', 'India'],
    '土耳其': ['TR', '土耳其', 'Turkey', 'Istanbul'],
    '马来西亚': ['MY', '马来西亚', 'Malaysia'],
    '泰国': ['TH', '泰国', 'Thailand', 'Bangkok'],
    '越南': ['VN', '越南', 'Vietnam'],
    '菲律宾': ['PH', '菲律宾', 'Philippines'],
    '印尼': ['ID', '印尼', 'Indonesia']
};

/**
 * 节点协议正则表达式
 */
export const NODE_PROTOCOL_REGEX = /^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//g;

/**
 * 为节点名称添加前缀
 * @param {string} link - 节点链接
 * @param {string} prefix - 前缀文本
 * @returns {string} - 添加前缀后的链接
 */
export function prependNodeName(link, prefix) {
    if (!prefix) return link;

    const appendToFragment = (baseLink, namePrefix) => {
        const hashIndex = baseLink.lastIndexOf('#');
        const originalName = hashIndex !== -1 ? decodeURIComponent(baseLink.substring(hashIndex + 1)) : '';
        const base = hashIndex !== -1 ? baseLink.substring(0, hashIndex) : baseLink;
        if (originalName.startsWith(namePrefix)) {
            return baseLink;
        }
        const newName = originalName ? `${namePrefix} - ${originalName}` : namePrefix;
        return `${base}#${encodeURIComponent(newName)}`;
    };

    if (link.startsWith('vmess://')) {
        try {
            const base64Part = link.substring('vmess://'.length);
            const binaryString = atob(base64Part);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const jsonString = new TextDecoder('utf-8').decode(bytes);
            const nodeConfig = JSON.parse(jsonString);
            const originalPs = nodeConfig.ps || '';
            if (!originalPs.startsWith(prefix)) {
                nodeConfig.ps = originalPs ? `${prefix} - ${originalPs}` : prefix;
            }
            const newJsonString = JSON.stringify(nodeConfig);
            const newBase64Part = btoa(unescape(encodeURIComponent(newJsonString)));
            return 'vmess://' + newBase64Part;
        } catch (e) {
            console.error("为 vmess 节点添加名称前缀失败，将回退到通用方法。", e);
            return appendToFragment(link, prefix);
        }
    }
    return appendToFragment(link, prefix);
}

/**
 * 从节点URL提取地区信息
 * @param {string} nodeName - 节点名称
 * @returns {string} - 地区名称
 */
export function extractRegionFromNodeName(nodeName) {
    for (const [regionName, keywords] of Object.entries(REGION_KEYWORDS)) {
        if (keywords.some(keyword => nodeName.toLowerCase().includes(keyword.toLowerCase()))) {
            return regionName;
        }
    }
    return '其他';
}

/**
 * 从节点URL提取协议类型
 * @param {string} nodeUrl - 节点URL
 * @returns {string} - 协议类型
 */
export function extractProtocolFromNodeUrl(nodeUrl) {
    const protocolMatch = nodeUrl.match(/^(.*?):\/\//);
    return protocolMatch ? protocolMatch[1].toLowerCase() : 'unknown';
}

/**
 * 从节点URL提取节点名称
 * @param {string} nodeUrl - 节点URL
 * @returns {string} - 节点名称
 */
export function extractNodeNameFromUrl(nodeUrl) {
    const hashIndex = nodeUrl.lastIndexOf('#');
    if (hashIndex !== -1) {
        try {
            return decodeURIComponent(nodeUrl.substring(hashIndex + 1));
        } catch (e) {
            return nodeUrl.substring(hashIndex + 1);
        }
    }
    return '未命名节点';
}

/**
 * 修复手动SS节点中的URL编码问题
 * @param {string} nodeUrl - 节点URL
 * @returns {string} - 修复后的URL
 */
export function fixSSEncoding(nodeUrl) {
    if (!nodeUrl.startsWith('ss://')) {
        return nodeUrl;
    }

    try {
        const hashIndex = nodeUrl.indexOf('#');
        let baseLink = hashIndex !== -1 ? nodeUrl.substring(0, hashIndex) : nodeUrl;
        let fragment = hashIndex !== -1 ? nodeUrl.substring(hashIndex) : '';

        // 检查base64部分是否包含URL编码字符
        const protocolEnd = baseLink.indexOf('://');
        const atIndex = baseLink.indexOf('@');
        if (protocolEnd !== -1 && atIndex !== -1) {
            const base64Part = baseLink.substring(protocolEnd + 3, atIndex);
            if (base64Part.includes('%')) {
                // 解码URL编码的base64部分
                const decodedBase64 = decodeURIComponent(base64Part);
                baseLink = 'ss://' + decodedBase64 + baseLink.substring(atIndex);
            }
        }
        return baseLink + fragment;
    } catch (e) {
        // 如果处理失败，返回原始链接
        return nodeUrl;
    }
}

/**
 * 修复节点URL中的编码问题（支持多种协议）
 * @param {string} nodeUrl - 节点URL
 * @returns {string} - 修复后的URL
 */
export function fixNodeUrlEncoding(nodeUrl) {
    if (!nodeUrl.startsWith('ss://') && !nodeUrl.startsWith('vless://') && !nodeUrl.startsWith('trojan://')) {
        return nodeUrl;
    }

    try {
        const hashIndex = nodeUrl.indexOf('#');
        let baseLink = hashIndex !== -1 ? nodeUrl.substring(0, hashIndex) : nodeUrl;
        let fragment = hashIndex !== -1 ? nodeUrl.substring(hashIndex) : '';

        // 检查base64部分是否包含URL编码字符
        const protocolEnd = baseLink.indexOf('://');
        const atIndex = baseLink.indexOf('@');
        if (protocolEnd !== -1 && atIndex !== -1) {
            const base64Part = baseLink.substring(protocolEnd + 3, atIndex);
            if (base64Part.includes('%')) {
                // 解码URL编码的base64部分
                const decodedBase64 = decodeURIComponent(base64Part);
                const protocol = baseLink.substring(0, protocolEnd);
                baseLink = protocol + '://' + decodedBase64 + baseLink.substring(atIndex);
            }
        }
        return baseLink + fragment;
    } catch (e) {
        // 如果处理失败，返回原始链接
        return nodeUrl;
    }
}