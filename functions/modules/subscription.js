/**
 * 订阅处理模块
 * 处理订阅获取、节点解析和格式转换
 */

import { formatBytes, prependNodeName, getProcessedUserAgent } from './utils.js';
import { addFlagEmoji, fixNodeUrlEncoding } from '../utils/node-utils.js';
// [新增] 引入 node-parser 中的解析函数
import { extractValidNodes } from './utils/node-parser.js'; 
import { sendEnhancedTgNotification } from './notifications.js';

export const defaultSettings = {
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
    },
    NotifyThresholdDays: 3,
    NotifyThresholdPercent: 90,
    storageType: 'kv'
};

export async function generateCombinedNodeList(context, config, userAgent, misubs, prependedContent = '', profilePrefixSettings = null) {
    const shouldPrependManualNodes = profilePrefixSettings?.enableManualNodes ??
        config.prefixConfig?.enableManualNodes ??
        config.prependSubName ?? true;

    const manualNodePrefix = profilePrefixSettings?.manualNodePrefix ??
        config.prefixConfig?.manualNodePrefix ??
        '手动节点';

    // --- 处理手动节点 ---
    const processedManualNodes = misubs.filter(sub => !sub.url.toLowerCase().startsWith('http')).map(node => {
        if (node.isExpiredNode) {
            return node.url;
        } else {
            let processedUrl = node.url;
            processedUrl = fixNodeUrlEncoding(processedUrl);
            processedUrl = addFlagEmoji(processedUrl);
            return shouldPrependManualNodes ? prependNodeName(processedUrl, manualNodePrefix) : processedUrl;
        }
    }).join('\n');

    // --- 处理订阅节点 ---
    const httpSubs = misubs.filter(sub => sub.url.toLowerCase().startsWith('http'));
    const subPromises = httpSubs.map(async (sub) => {
        try {
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
                new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 15000))
            ]);
            
            if (!response.ok) {
                console.warn(`订阅请求失败: ${sub.url}, 状态: ${response.status}`);
                return '';
            }
            
            const text = await response.text();

            // [核心修复] 移除了之前会拦截 proxies: 和 outbounds 的 if 判断
            // 直接使用 extractValidNodes，它会自动识别 Clash YAML、Base64 或纯文本
            const rawNodes = extractValidNodes(text);
            
            let validNodes = rawNodes
                .map(line => line.trim())
                .map(line => {
                    // 1. 修复编码 (包含 Hysteria2 密码解码)
                    return fixNodeUrlEncoding(line);
                })
                .map(line => {
                    // 2. 添加国旗 Emoji
                    return addFlagEmoji(line);
                });

            // 过滤规则处理
            if (sub.exclude && sub.exclude.trim() !== '') {
                const rules = sub.exclude.trim().split('\n').map(r => r.trim()).filter(Boolean);
                const keepRules = rules.filter(r => r.toLowerCase().startsWith('keep:'));

                if (keepRules.length > 0) {
                    // 白名单模式
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
                        const protocolMatch = nodeLink.match(/^(.*?):\/\//);
                        const protocol = protocolMatch ? protocolMatch[1].toLowerCase() : '';
                        if (protocolsToKeep.has(protocol)) return true;
                        if (nameRegex) {
                            const hashIndex = nodeLink.lastIndexOf('#');
                            if (hashIndex !== -1) {
                                try {
                                    const nodeName = decodeURIComponent(nodeLink.substring(hashIndex + 1));
                                    if (nameRegex.test(nodeName)) return true;
                                } catch (e) {}
                            }
                        }
                        return false;
                    });
                } else {
                    // 黑名单模式
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
                        if (protocolsToExclude.has(protocol)) return false;
                        if (nameRegex) {
                            const hashIndex = nodeLink.lastIndexOf('#');
                            if (hashIndex !== -1) {
                                try {
                                    const nodeName = decodeURIComponent(nodeLink.substring(hashIndex + 1));
                                    if (nameRegex.test(nodeName)) return false;
                                } catch (e) {}
                            }
                            else if (protocol === 'vmess') {
                                try {
                                    const base64Part = nodeLink.substring('vmess://'.length);
                                    const binaryString = atob(base64Part);
                                    const bytes = new Uint8Array(binaryString.length);
                                    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                                    const nodeConfig = JSON.parse(new TextDecoder('utf-8').decode(bytes));
                                    if (nameRegex.test(nodeConfig.ps || '')) return false;
                                } catch (e) {}
                            }
                        }
                        return true;
                    });
                }
            }

            const shouldPrependSubscriptions = profilePrefixSettings?.enableSubscriptions ??
                config.prefixConfig?.enableSubscriptions ??
                config.prependSubName ?? true;

            return (shouldPrependSubscriptions && sub.name)
                ? validNodes.map(node => prependNodeName(node, sub.name)).join('\n')
                : validNodes.join('\n');
        } catch (e) {
            const errorNodeName = `连接错误-${sub.name || '未知'}`;
            return `trojan://error@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp#${encodeURIComponent(errorNodeName)}`;
        }
    });

    const processedSubContents = await Promise.all(subPromises);
    const combinedContent = (processedManualNodes + '\n' + processedSubContents.join('\n'));
    const uniqueNodesString = [...new Set(combinedContent.split('\n').map(line => line.trim()).filter(line => line))].join('\n');

    let finalNodeList = uniqueNodesString;
    if (finalNodeList.length > 0 && !finalNodeList.endsWith('\n')) {
        finalNodeList += '\n';
    }

    if (prependedContent) {
        return `${prependedContent}\n${finalNodeList}`;
    }
    return finalNodeList;
}