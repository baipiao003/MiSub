/**
 * 内置 Surge 配置生成器
 * 不依赖外部 SubConverter，直接将节点 URL 转换为 Surge 配置
 * 严格遵循 Surge 官方文档 https://manual.nssurge.com/policy/proxy.html
 *
 * 支持协议：SS、VMess、Trojan、Snell、TUIC、Hysteria2、AnyTLS、HTTP(S)、SOCKS5
 * 注意：Surge 不支持 VLESS 协议，VLESS 节点会被跳过
 */

import { urlToClashProxy } from '../../utils/url-to-clash.js';

/**
 * 对可能含特殊字符（逗号、空格、等号）的参数值进行双引号包裹
 * Surge 配置使用逗号分隔参数，若值本身含逗号则必须引用
 * @param {string} value
 * @returns {string}
 */
function surgeQuote(value) {
    if (!value) return '';
    // 含逗号、空格或双引号时需要包裹
    if (/[,\s"=]/.test(value)) {
        return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
}

/**
 * 将 Clash 代理对象转换为 Surge [Proxy] 行
 * @param {Object} proxy - Clash 格式代理对象
 * @returns {string|null} Surge 代理行
 */
function clashProxyToSurgeLine(proxy) {
    if (!proxy || !proxy.server || !proxy.port) return null;

    const name = proxy.name || 'Untitled';
    const type = (proxy.type || '').toLowerCase();
    const server = proxy.server;
    const port = proxy.port;

    // 构造参数列表（第一个元素是 "name = type"，后跟位置参数，再跟具名参数）
    const parts = [];

    if (type === 'ss' || type === 'shadowsocks') {
        // 格式: name = ss, server, port, encrypt-method=xxx, password=xxx
        parts.push(`${name} = ss`);
        parts.push(server);
        parts.push(String(port));
        parts.push(`encrypt-method=${proxy.cipher || 'aes-128-gcm'}`);
        parts.push(`password=${surgeQuote(proxy.password || '')}`);
        // obfs 支持
        if (proxy.plugin === 'obfs-local' || proxy.pluginOpts?.mode) {
            const obfsMode = proxy.pluginOpts?.mode || proxy.obfs;
            if (obfsMode) parts.push(`obfs=${obfsMode}`);
            if (proxy.pluginOpts?.host || proxy['obfs-host']) {
                parts.push(`obfs-host=${proxy.pluginOpts?.host || proxy['obfs-host']}`);
            }
        }
        // SS 的 UDP 需要手动开启
        if (proxy.udp) parts.push('udp-relay=true');
    } else if (type === 'vmess') {
        // 格式: name = vmess, server, port, username=uuid
        parts.push(`${name} = vmess`);
        parts.push(server);
        parts.push(String(port));
        parts.push(`username=${proxy.uuid || ''}`);
        // 加密方式
        if (proxy.cipher && proxy.cipher !== 'auto') {
            parts.push(`encrypt-method=${proxy.cipher}`);
        }
        // TLS
        if (proxy.tls) parts.push('tls=true');
        // WebSocket
        if (proxy.network === 'ws') {
            parts.push('ws=true');
            const wsOpts = proxy['ws-opts'] || proxy.wsOpts;
            if (wsOpts?.path) parts.push(`ws-path=${wsOpts.path}`);
            if (wsOpts?.headers?.Host) parts.push(`ws-headers=Host:${wsOpts.headers.Host}`);
        }
        // vmess-aead
        if (proxy.alterId === 0) parts.push('vmess-aead=true');
        // TLS 通用参数
        appendTlsParams(parts, proxy);
    } else if (type === 'trojan') {
        // 格式: name = trojan, server, port, password=xxx
        parts.push(`${name} = trojan`);
        parts.push(server);
        parts.push(String(port));
        parts.push(`password=${surgeQuote(proxy.password || '')}`);
        // WebSocket
        if (proxy.network === 'ws') {
            parts.push('ws=true');
            const wsOpts = proxy['ws-opts'] || proxy.wsOpts;
            if (wsOpts?.path) parts.push(`ws-path=${wsOpts.path}`);
            if (wsOpts?.headers?.Host) parts.push(`ws-headers=Host:${wsOpts.headers.Host}`);
        }
        // TLS 通用参数
        appendTlsParams(parts, proxy);
    } else if (type === 'hysteria2' || type === 'hy2') {
        // 格式: name = hysteria2, server, port, password=xxx
        // Hysteria2 原生基于 QUIC/UDP，无需 udp-relay 参数
        parts.push(`${name} = hysteria2`);
        parts.push(server);
        parts.push(String(port));
        parts.push(`password=${surgeQuote(proxy.password || '')}`);
        // 带宽限制（可选，单位 Mbps）
        if (proxy['down'] || proxy['download-bandwidth']) {
            parts.push(`download-bandwidth=${proxy['down'] || proxy['download-bandwidth']}`);
        }
        // TLS 通用参数
        appendTlsParams(parts, proxy);
    } else if (type === 'tuic') {
        // 格式: name = tuic, server, port, token=xxx
        parts.push(`${name} = tuic`);
        parts.push(server);
        parts.push(String(port));
        parts.push(`token=${surgeQuote(proxy.token || proxy.password || '')}`);
        // alpn（必须与服务端 ALPN 匹配）
        if (proxy.alpn) {
            const alpnStr = Array.isArray(proxy.alpn) ? proxy.alpn[0] : proxy.alpn;
            parts.push(`alpn=${alpnStr}`);
        }
        // TLS 通用参数
        appendTlsParams(parts, proxy);
    } else if (type === 'snell') {
        // 格式: name = snell, server, port, psk=xxx, version=x
        parts.push(`${name} = snell`);
        parts.push(server);
        parts.push(String(port));
        parts.push(`psk=${surgeQuote(proxy.psk || proxy.password || '')}`);
        if (proxy.version) parts.push(`version=${proxy.version}`);
        // 连接复用（Snell V4 可选）
        if (proxy.reuse !== undefined) parts.push(`reuse=${proxy.reuse}`);
        // obfs
        const obfsOpts = proxy['obfs-opts'];
        if (obfsOpts) {
            if (obfsOpts.mode) parts.push(`obfs=${obfsOpts.mode}`);
            if (obfsOpts.host) parts.push(`obfs-host=${obfsOpts.host}`);
        }
        // Snell 的 UDP 需要手动开启
        if (proxy.udp) parts.push('udp-relay=true');
    } else if (type === 'anytls') {
        // 格式: name = anytls, server, port, password=xxx (Surge 5.17+)
        parts.push(`${name} = anytls`);
        parts.push(server);
        parts.push(String(port));
        parts.push(`password=${surgeQuote(proxy.password || '')}`);
        // TLS 通用参数
        appendTlsParams(parts, proxy);
    } else if (type === 'http' || type === 'https') {
        // 格式: name = http/https, server, port, username, password
        parts.push(`${name} = ${type}`);
        parts.push(server);
        parts.push(String(port));
        // HTTP(S) 的用户名和密码是位置参数
        parts.push(proxy.username || '');
        parts.push(proxy.password || '');
        if (type === 'https') appendTlsParams(parts, proxy);
    } else if (type === 'socks5' || type === 'socks5-tls') {
        // 格式: name = socks5/socks5-tls, server, port, username, password
        parts.push(`${name} = ${type}`);
        parts.push(server);
        parts.push(String(port));
        // SOCKS5 的用户名和密码是位置参数
        if (proxy.username || proxy.password) {
            parts.push(proxy.username || '');
            parts.push(proxy.password || '');
        }
        // SOCKS5 的 UDP 需要手动开启
        if (proxy.udp) parts.push('udp-relay=true');
        if (type === 'socks5-tls') appendTlsParams(parts, proxy);
    } else if (type === 'vless') {
        // Surge 不原生支持 VLESS 协议，跳过
        console.debug(`[BuiltinSurge] 跳过不支持的 VLESS 节点: ${name}`);
        return null;
    } else {
        // 不支持的类型
        return null;
    }

    // 链式代理支持
    if (proxy['dialer-proxy']) {
        parts.push(`underlying-proxy=${proxy['dialer-proxy']}`);
    }

    // Shadow TLS 支持
    if (proxy['shadow-tls-password']) {
        parts.push(`shadow-tls-password=${proxy['shadow-tls-password']}`);
        if (proxy['shadow-tls-sni']) parts.push(`shadow-tls-sni=${proxy['shadow-tls-sni']}`);
        if (proxy['shadow-tls-version']) parts.push(`shadow-tls-version=${proxy['shadow-tls-version']}`);
    }

    return parts.join(', ');
}

/**
 * 添加 TLS 代理通用参数（skip-cert-verify, sni, server-cert-fingerprint-sha256）
 * @param {string[]} parts - 参数列表
 * @param {Object} proxy - 代理对象
 */
function appendTlsParams(parts, proxy) {
    if (proxy.sni || proxy.servername) {
        parts.push(`sni=${proxy.sni || proxy.servername}`);
    }
    if (proxy['skip-cert-verify'] || proxy.skipCertVerify) {
        parts.push('skip-cert-verify=true');
    }
    if (proxy['server-cert-fingerprint-sha256']) {
        parts.push(`server-cert-fingerprint-sha256=${proxy['server-cert-fingerprint-sha256']}`);
    }
}

/**
 * 生成完整的内置 Surge 配置
 * @param {string} nodeList - 节点列表（换行分隔的 URL）
 * @param {Object} options - 配置选项
 * @returns {string} Surge INI 配置
 */
export function generateBuiltinSurgeConfig(nodeList, options = {}) {
    const {
        fileName = 'MiSub',
        managedConfigUrl = '',
        interval = 86400
    } = options;

    // 解析节点 URL 列表
    const nodeUrls = nodeList
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

    // URL → Clash Proxy Object → Surge Line
    const proxyLines = [];
    const proxyNames = [];

    for (const url of nodeUrls) {
        const clashProxy = urlToClashProxy(url);
        if (!clashProxy) continue;

        const surgeLine = clashProxyToSurgeLine(clashProxy);
        if (surgeLine) {
            proxyLines.push(surgeLine);
            proxyNames.push(clashProxy.name);
        }
    }

    // 处理重名（使用精确的名称匹配替换，避免误伤参数内容）
    const usedNames = new Set();
    const finalProxyLines = [];
    const finalProxyNames = [];

    for (let i = 0; i < proxyLines.length; i++) {
        let name = proxyNames[i];
        if (usedNames.has(name)) {
            let j = 1;
            while (usedNames.has(`${name}_${j}`)) j++;
            const newName = `${name}_${j}`;
            // 仅替换行首的名称部分（"name = " 前缀）
            finalProxyLines.push(proxyLines[i].replace(`${name} = `, `${newName} = `));
            finalProxyNames.push(newName);
            usedNames.add(newName);
        } else {
            finalProxyLines.push(proxyLines[i]);
            finalProxyNames.push(name);
            usedNames.add(name);
        }
    }

    if (finalProxyLines.length === 0) {
        return `[General]\nloglevel = notify\n\n[Proxy]\nDIRECT = direct\n\n[Proxy Group]\n\n[Rule]\nFINAL,DIRECT\n`;
    }

    // 构建 Surge 配置
    const sections = [];

    // #!MANAGED-CONFIG（可选）
    const managedLine = managedConfigUrl
        ? `#!MANAGED-CONFIG ${managedConfigUrl} interval=${interval} strict=false\n\n`
        : '';

    // [General]
    sections.push(`${managedLine}[General]
loglevel = notify
skip-proxy = 127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, 100.64.0.0/10, localhost, *.local
dns-server = 119.29.29.29, 223.5.5.5, system`);

    // [Proxy]
    sections.push(`[Proxy]
DIRECT = direct
${finalProxyLines.join('\n')}`);

    // [Proxy Group]
    const proxyNamesList = finalProxyNames.join(', ');
    sections.push(`[Proxy Group]
📶 节点选择 = select, ♻️ 自动选择, ${proxyNamesList}, DIRECT
♻️ 自动选择 = url-test, ${proxyNamesList}, url=http://www.gstatic.com/generate_204, interval=300, tolerance=50`);

    // [Rule]
    sections.push(`[Rule]
GEOIP,CN,DIRECT
FINAL,📶 节点选择`);

    return sections.join('\n\n') + '\n';
}
