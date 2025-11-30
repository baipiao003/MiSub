/**
 * 节点处理工具函数
 * @author MiSub Team
 */

// [修复] 使用正确的相对路径引用 modules/utils 下的 geo-utils
import { extractNodeRegion, getRegionEmoji } from '../modules/utils/geo-utils.js';

/**
 * 节点协议正则表达式
 */
export const NODE_PROTOCOL_REGEX = /^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//g;

/**
 * 为节点名称添加前缀
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
 * [兼容导出] 从节点URL提取地区信息
 */
export function extractRegionFromNodeName(nodeName) {
    return extractNodeRegion(nodeName);
}

/**
 * 为节点链接添加国旗 Emoji
 */
export function addFlagEmoji(link) {
    if (!link) return link;

    const appendEmoji = (name) => {
        const region = extractNodeRegion(name);
        const emoji = getRegionEmoji(region);
        if (!emoji) return name;
        if (name.includes(emoji)) return name;
        return `${emoji} ${name}`;
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
            if (nodeConfig.ps) {
                nodeConfig.ps = appendEmoji(nodeConfig.ps);
                const newJsonString = JSON.stringify(nodeConfig);
                const newBase64Part = btoa(unescape(encodeURIComponent(newJsonString)));
                return 'vmess://' + newBase64Part;
            }
            return link;
        } catch (e) {
            return link;
        }
    } else {
        const hashIndex = link.lastIndexOf('#');
        if (hashIndex === -1) return link;
        try {
            const originalName = decodeURIComponent(link.substring(hashIndex + 1));
            const newName = appendEmoji(originalName);
            return link.substring(0, hashIndex + 1) + encodeURIComponent(newName);
        } catch (e) {
            return link;
        }
    }
}

/**
 * [核心修复] 修复节点URL中的编码问题（包含 Hysteria2 密码解码）
 */
export function fixNodeUrlEncoding(nodeUrl) {
    // 1. 针对 Hysteria2 的 obfs-password 进行解码
    if (nodeUrl.startsWith('hysteria2://')) {
        // 查找 obfs-password= 及其后的值，并进行 URL 解码
        // 例如：obfs-password=Aq112211%21 -> obfs-password=Aq112211!
        nodeUrl = nodeUrl.replace(/([?&]obfs-password=)([^&]+)/g, (match, prefix, value) => {
            try {
                return prefix + decodeURIComponent(value);
            } catch (e) {
                return match;
            }
        });
        return nodeUrl;
    }

    // 2. 其他协议的 Base64 修复逻辑
    if (!nodeUrl.startsWith('ss://') && !nodeUrl.startsWith('vless://') && !nodeUrl.startsWith('trojan://')) {
        return nodeUrl;
    }

    try {
        const hashIndex = nodeUrl.indexOf('#');
        let baseLink = hashIndex !== -1 ? nodeUrl.substring(0, hashIndex) : nodeUrl;
        let fragment = hashIndex !== -1 ? nodeUrl.substring(hashIndex) : '';

        const protocolEnd = baseLink.indexOf('://');
        const atIndex = baseLink.indexOf('@');
        if (protocolEnd !== -1 && atIndex !== -1) {
            const base64Part = baseLink.substring(protocolEnd + 3, atIndex);
            if (base64Part.includes('%')) {
                const decodedBase64 = decodeURIComponent(base64Part);
                const protocol = baseLink.substring(0, protocolEnd);
                baseLink = protocol + '://' + decodedBase64 + baseLink.substring(atIndex);
            }
        }
        return baseLink + fragment;
    } catch (e) {
        return nodeUrl;
    }
}