/**
 * 订阅处理服务
 * @author MiSub Team
 */

import { NODE_PROTOCOL_REGEX } from '../utils/node-utils.js';
import { getProcessedUserAgent } from '../utils/format-utils.js';
import { prependNodeName } from '../utils/node-utils.js';

/**
 * 生成组合节点列表
 * @param {Object} context - 请求上下文
 * @param {Object} config - 配置对象
 * @param {string} userAgent - 用户代理
 * @param {Array} misubs - 订阅列表
 * @param {string} prependedContent - 预置内容
 * @param {Object} profilePrefixSettings - 配置文件前缀设置
 * @returns {Promise<string>} - 组合后的节点列表
 */
export async function generateCombinedNodeList(context, config, userAgent, misubs, prependedContent = '', profilePrefixSettings = null) {
    // 判断是否启用手动节点前缀
    const shouldPrependManualNodes = profilePrefixSettings?.enableManualNodes ??
        config.prefixConfig?.enableManualNodes ??
        config.prependSubName ?? true;

    // 手动节点前缀文本
    const manualNodePrefix = profilePrefixSettings?.manualNodePrefix ??
        config.prefixConfig?.manualNodePrefix ??
        '手动节点';

    const processedManualNodes = misubs.filter(sub => !sub.url.toLowerCase().startsWith('http')).map(node => {
        if (node.isExpiredNode) {
            return node.url; // Directly use the URL for expired node
        } else {
            // 修复手动SS节点中的URL编码问题
            let processedUrl = fixSSEncoding(node.url);

            return shouldPrependManualNodes ? prependNodeName(processedUrl, manualNodePrefix) : processedUrl;
        }
    }).join('\n');

    const httpSubs = misubs.filter(sub => sub.url.toLowerCase().startsWith('http'));
    const subPromises = httpSubs.map(async (sub) => {
        try {
            // 使用处理后的用户代理
            const processedUserAgent = getProcessedUserAgent(userAgent, sub.url);
            const requestHeaders = { 'User-Agent': processedUserAgent };
            const response = await Promise.race([
                fetch(new Request(sub.url, {
                    headers: requestHeaders,
                    redirect: "follow",
                    cf: {
                        insecureSkipVerify: true,
                        allowUntrusted: true,
                        validateCertificate: false
                    }
                })),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 8000))
            ]);
            if (!response.ok) {
                console.warn(`订阅请求失败: ${sub.url}, 状态: ${response.status}`);
                return '';
            }
            let text = await response.text();

            // 智能内容类型检测 - 更精确的判断条件
            if (text.includes('proxies:') && text.includes('rules:')) {
                // 这是完整的Clash配置文件，不是节点列表
                return '';
            } else if (text.includes('outbounds') && text.includes('inbounds') && text.includes('route')) {
                // 这是完整的Singbox配置文件，不是节点列表
                return '';
            }

            text = await decodeBase64Content(text);

            let validNodes = text.replace(/\r\n/g, '\n').split('\n')
                .map(line => line.trim())
                .filter(line => NODE_PROTOCOL_REGEX.test(line))
                .map(line => fixNodeUrlEncoding(line));

            // 应用过滤规则
            validNodes = applyFilterRules(validNodes, sub);

            // 判断是否启用订阅前缀
            const shouldPrependSubscriptions = profilePrefixSettings?.enableSubscriptions ??
                config.prefixConfig?.enableSubscriptions ??
                config.prependSubName ?? true;

            return (shouldPrependSubscriptions && sub.name)
                ? validNodes.map(node => prependNodeName(node, sub.name)).join('\n')
                : validNodes.join('\n');
        } catch (e) {
            // 订阅处理错误，生成错误节点
            const errorNodeName = `连接错误-${sub.name || '未知'}`;
            return `trojan://error@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp#${encodeURIComponent(errorNodeName)}`;
        }
    });

    const processedSubContents = await Promise.all(subPromises);
    const combinedContent = (processedManualNodes + '\n' + processedSubContents.join('\n'));
    const uniqueNodesString = [...new Set(combinedContent.split('\n').map(line => line.trim()).filter(line => line))].join('\n');

    // 确保最终的字符串在非空时以换行符结束，以兼容 subconverter
    let finalNodeList = uniqueNodesString;
    if (finalNodeList.length > 0 && !finalNodeList.endsWith('\n')) {
        finalNodeList += '\n';
    }

    // 将虚假节点（如果存在）插入到列表最前面
    if (prependedContent) {
        return `${prependedContent}\n${finalNodeList}`;
    }
    return finalNodeList;
}

/**
 * 解码Base64内容
 * @param {string} text - 可能包含Base64的文本
 * @returns {Promise<string>} - 解码后的文本
 */
async function decodeBase64Content(text) {
    try {
        const cleanedText = text.replace(/\s/g, '');
        const { isValidBase64 } = await import('../utils/format-utils.js');
        if (isValidBase64(cleanedText)) {
            const binaryString = atob(cleanedText);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
            return new TextDecoder('utf-8').decode(bytes);
        }
    } catch (e) {
        // Base64解码失败，使用原始内容
    }
    return text;
}

/**
 * 修复SS节点编码
 * @param {string} nodeUrl - 节点URL
 * @returns {string} - 修复后的URL
 */
function fixSSEncoding(nodeUrl) {
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
        // 如果处理失败，使用原始链接
        return nodeUrl;
    }
}

/**
 * 修复节点URL编码问题（支持多种协议）
 * @param {string} nodeUrl - 节点URL
 * @returns {string} - 修复后的URL
 */
function fixNodeUrlEncoding(nodeUrl) {
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

/**
 * 应用过滤规则
 * @param {Array} validNodes - 有效节点列表
 * @param {Object} sub - 订阅对象
 * @returns {Array} - 过滤后的节点列表
 */
function applyFilterRules(validNodes, sub) {
    if (sub.exclude && sub.exclude.trim() !== '') {
        const rules = sub.exclude.trim().split('\n').map(r => r.trim()).filter(Boolean);

        const keepRules = rules.filter(r => r.toLowerCase().startsWith('keep:'));

        if (keepRules.length > 0) {
            // --- 白名单模式 (Inclusion Mode) ---
            const nameRegexParts = [];
            const protocolsToKeep = new Set();

            keepRules.forEach(rule => {
                const content = rule.substring('keep:'.length).trim();
                if (content.toLowerCase().startsWith('proto:')) {
                    const protocols = content.substring('proto:'.length).split(',').map(p => p.trim().toLowerCase());
                    protocols.forEach(p => protocolsToKeep.add(p));
                } else {
                    nameRegexParts.push(content);
                }
            });

            const nameRegex = nameRegexParts.length > 0 ? new RegExp(nameRegexParts.join('|'), 'i') : null;

            validNodes = validNodes.filter(nodeLink => {
                // 检查协议是否匹配
                const protocolMatch = nodeLink.match(/^(.*?):\/\//);
                const protocol = protocolMatch ? protocolMatch[1].toLowerCase() : '';
                if (protocolsToKeep.has(protocol)) {
                    return true;
                }

                // 检查名称是否匹配
                if (nameRegex) {
                    const hashIndex = nodeLink.lastIndexOf('#');
                    if (hashIndex !== -1) {
                        try {
                            const nodeName = decodeURIComponent(nodeLink.substring(hashIndex + 1));
                            if (nameRegex.test(nodeName)) {
                                return true;
                            }
                        } catch (e) { /* 忽略解码错误 */ }
                    }
                }
                return false; // 白名单模式下，不匹配任何规则则排除
            });

        } else {
            // --- 黑名单模式 (Exclusion Mode) ---
            const protocolsToExclude = new Set();
            const nameRegexParts = [];

            rules.forEach(rule => {
                if (rule.toLowerCase().startsWith('proto:')) {
                    const protocols = rule.substring('proto:'.length).split(',').map(p => p.trim().toLowerCase());
                    protocols.forEach(p => protocolsToExclude.add(p));
                } else {
                    nameRegexParts.push(rule);
                }
            });

            const nameRegex = nameRegexParts.length > 0 ? new RegExp(nameRegexParts.join('|'), 'i') : null;

            validNodes = validNodes.filter(nodeLink => {
                const protocolMatch = nodeLink.match(/^(.*?):\/\//);
                const protocol = protocolMatch ? protocolMatch[1].toLowerCase() : '';
                if (protocolsToExclude.has(protocol)) {
                    return false;
                }

                if (nameRegex) {
                    const hashIndex = nodeLink.lastIndexOf('#');
                    if (hashIndex !== -1) {
                        try {
                            const nodeName = decodeURIComponent(nodeLink.substring(hashIndex + 1));
                            if (nameRegex.test(nodeName)) {
                                return false;
                            }
                        } catch (e) { /* 忽略解码错误 */ }
                    }
                    // 对于vmess协议，需要特殊处理节点名称
                    else if (protocol === 'vmess') {
                        try {
                            // 提取vmess链接中的Base64部分
                            const base64Part = nodeLink.substring('vmess://'.length);
                            // 解码Base64
                            const binaryString = atob(base64Part);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            const jsonString = new TextDecoder('utf-8').decode(bytes);
                            const nodeConfig = JSON.parse(jsonString);
                            const nodeName = nodeConfig.ps || '';
                            if (nameRegex.test(nodeName)) {
                                return false;
                            }
                        } catch (e) { /* 忽略解码错误 */ }
                    }
                }
                return true;
            });
        }
    }
    return validNodes;
}