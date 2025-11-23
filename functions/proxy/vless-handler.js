/**
 * VLESS协议处理器
 * 负责处理VLESS协议的WebSocket连接和数据转发
 */

import { connect } from 'cloudflare:sockets';

export class VLESSHandler {
    constructor(config) {
        this.config = config;
    }

    /**
     * 处理VLESS WebSocket连接
     */
    async handleWebSocket(request) {
        const wssPair = new WebSocketPair();
        const [clientSock, serverSock] = Object.values(wssPair);
        serverSock.accept();

        let remoteConnWrapper = { socket: null };
        let isDnsQuery = false;

        const earlyData = request.headers.get('sec-websocket-protocol') || '';
        const readable = this.makeReadableStream(serverSock, earlyData);

        readable.pipeTo(new WritableStream({
            async write(chunk) {
                if (isDnsQuery) {
                    return await this.forwardUDP(chunk, serverSock, null);
                }

                if (remoteConnWrapper.socket) {
                    const writer = remoteConnWrapper.socket.writable.getWriter();
                    await writer.write(chunk);
                    writer.releaseLock();
                    return;
                }

                // 解析VLESS协议头
                const { hasError, message, addressType, port, hostname, rawIndex, version, isUDP } =
                    this.parseVLESSPacketHeader(chunk, this.config.uuid);

                if (hasError) {
                    throw new Error(message);
                }

                // 检查是否为测速站点
                if (this.isSpeedTestSite(hostname)) {
                    throw new Error('Speed test sites are blocked');
                }

                if (isUDP) {
                    if (port === 53) {
                        isDnsQuery = true;
                    } else {
                        throw new Error('UDP is not supported');
                    }
                }

                const respHeader = new Uint8Array([version[0], 0]);
                const rawData = chunk.slice(rawIndex);

                if (isDnsQuery) {
                    return this.forwardUDP(rawData, serverSock, respHeader);
                }

                await this.forwardTCP(hostname, port, rawData, serverSock, respHeader, remoteConnWrapper);
            },
        })).catch(() => {
            // 处理连接错误
        });

        return new Response(null, { status: 101, webSocket: clientSock });
    }

    /**
     * 解析VLESS数据包头部
     */
    parseVLESSPacketHeader(chunk, token) {
        if (chunk.byteLength < 24) {
            return { hasError: true, message: 'Invalid data' };
        }

        const version = new Uint8Array(chunk.slice(0, 1));

        if (this.formatIdentifier(new Uint8Array(chunk.slice(1, 17))) !== token) {
            return { hasError: true, message: 'Invalid uuid' };
        }

        const optLen = new Uint8Array(chunk.slice(17, 18))[0];
        const cmd = new Uint8Array(chunk.slice(18 + optLen, 19 + optLen))[0];

        let isUDP = false;
        if (cmd === 1) {
            // TCP
        } else if (cmd === 2) {
            isUDP = true;
        } else {
            return { hasError: true, message: 'Invalid command' };
        }

        const portIdx = 19 + optLen;
        const port = new DataView(chunk.slice(portIdx, portIdx + 2)).getUint16(0);

        let addrIdx = portIdx + 2;
        let addrLen = 0;
        let addrValIdx = addrIdx + 1;
        let hostname = '';

        const addressType = new Uint8Array(chunk.slice(addrIdx, addrValIdx))[0];

        switch (addressType) {
            case 1: // IPv4
                addrLen = 4;
                hostname = new Uint8Array(chunk.slice(addrValIdx, addrValIdx + addrLen)).join('.');
                break;

            case 2: // Domain
                addrLen = new Uint8Array(chunk.slice(addrValIdx, addrValIdx + 1))[0];
                addrValIdx += 1;
                hostname = new TextDecoder().decode(chunk.slice(addrValIdx, addrValIdx + addrLen));
                break;

            case 3: // IPv6
                addrLen = 16;
                const ipv6 = [];
                const ipv6View = new DataView(chunk.slice(addrValIdx, addrValIdx + addrLen));
                for (let i = 0; i < 8; i++) {
                    ipv6.push(ipv6View.getUint16(i * 2).toString(16));
                }
                hostname = ipv6.join(':');
                break;

            default:
                return { hasError: true, message: `Invalid address type: ${addressType}` };
        }

        if (!hostname) {
            return { hasError: true, message: `Invalid address: ${addressType}` };
        }

        return {
            hasError: false,
            addressType,
            port,
            hostname,
            isUDP,
            rawIndex: addrValIdx + addrLen,
            version
        };
    }

    /**
     * 转发TCP数据
     */
    async forwardTCP(host, portNum, rawData, ws, respHeader, remoteConnWrapper) {
        const customProxyIP = null; // 可以从请求中获取自定义代理IP

        async function connectDirect(address, port, data) {
            const remoteSock = connect({ hostname: address, port: port });
            const writer = remoteSock.writable.getWriter();
            await writer.write(data);
            writer.releaseLock();
            return remoteSock;
        }

        let proxyConfig = null;
        let shouldUseProxy = false;

        // 解析代理配置
        if (customProxyIP) {
            proxyConfig = this.parseProxyAddress(customProxyIP);
            if (proxyConfig && (proxyConfig.type === 'socks5' || proxyConfig.type === 'http')) {
                shouldUseProxy = true;
            }
        } else if (this.config.proxyIP) {
            proxyConfig = this.parseProxyAddress(this.config.proxyIP);
            if (proxyConfig && (proxyConfig.type === 'socks5' || proxyConfig.type === 'http')) {
                shouldUseProxy = true;
            }
        }

        async function connectToProxy() {
            let newSocket;
            if (proxyConfig.type === 'socks5') {
                newSocket = await this.connectToSocks5(proxyConfig, host, portNum, rawData);
            } else if (proxyConfig.type === 'http') {
                newSocket = await this.connectToHTTP(proxyConfig, host, portNum, rawData);
            } else {
                newSocket = await connectDirect(proxyConfig.host, proxyConfig.port, rawData);
            }

            remoteConnWrapper.socket = newSocket;
            newSocket.closed.catch(() => {}).finally(() => this.closeSocketQuietly(ws));
            this.connectStreams(newSocket, ws, respHeader, null);
        }

        if (shouldUseProxy) {
            try {
                await connectToProxy.call(this);
            } catch (err) {
                throw err;
            }
        } else {
            try {
                const initialSocket = await connectDirect(host, portNum, rawData);
                remoteConnWrapper.socket = initialSocket;
                this.connectStreams(initialSocket, ws, respHeader, connectToProxy.bind(this));
            } catch (err) {
                await connectToProxy.call(this);
            }
        }
    }

    /**
     * 转发UDP数据
     */
    async forwardUDP(udpChunk, webSocket, respHeader) {
        try {
            const tcpSocket = connect({ hostname: '8.8.4.4', port: 53 });
            let vlessHeader = respHeader;

            const writer = tcpSocket.writable.getWriter();
            await writer.write(udpChunk);
            writer.releaseLock();

            await tcpSocket.readable.pipeTo(new WritableStream({
                async write(chunk) {
                    if (webSocket.readyState === WebSocket.OPEN) {
                        if (vlessHeader) {
                            const response = new Uint8Array(vlessHeader.length + chunk.byteLength);
                            response.set(vlessHeader, 0);
                            response.set(chunk, vlessHeader.length);
                            webSocket.send(response.buffer);
                            vlessHeader = null;
                        } else {
                            webSocket.send(chunk);
                        }
                    }
                },
            }));
        } catch (error) {
            console.error('UDP forward error:', error);
        }
    }

    /**
     * 创建可读流
     */
    makeReadableStream(socket, earlyDataHeader) {
        let cancelled = false;
        return new ReadableStream({
            start(controller) {
                socket.addEventListener('message', (event) => {
                    if (!cancelled) controller.enqueue(event.data);
                });
                socket.addEventListener('close', () => {
                    if (!cancelled) {
                        this.closeSocketQuietly(socket);
                        controller.close();
                    }
                });
                socket.addEventListener('error', (err) => controller.error(err));

                const { earlyData, error } = this.base64ToArray(earlyDataHeader);
                if (error) {
                    controller.error(error);
                } else if (earlyData) {
                    controller.enqueue(earlyData);
                }
            },
            cancel() {
                cancelled = true;
                this.closeSocketQuietly(socket);
            }
        });
    }

    /**
     * 连接数据流
     */
    connectStreams(remoteSocket, webSocket, headerData, retryFunc) {
        let header = headerData;
        let hasData = false;

        remoteSocket.readable.pipeTo(
            new WritableStream({
                async write(chunk, controller) {
                    hasData = true;
                    if (webSocket.readyState !== WebSocket.OPEN) {
                        controller.error('WebSocket is not open');
                        return;
                    }

                    if (header) {
                        const response = new Uint8Array(header.length + chunk.byteLength);
                        response.set(header, 0);
                        response.set(chunk, header.length);
                        webSocket.send(response.buffer);
                        header = null;
                    } else {
                        webSocket.send(chunk);
                    }
                },
                abort() {},
            })
        ).catch(() => {
            this.closeSocketQuietly(webSocket);
        });

        if (!hasData && retryFunc) {
            retryFunc();
        }
    }

    /**
     * 解析代理地址
     */
    parseProxyAddress(serverStr) {
        if (!serverStr) return null;
        serverStr = serverStr.trim();

        // 解析 SOCKS5
        if (serverStr.startsWith('socks://') || serverStr.startsWith('socks5://')) {
            const urlStr = serverStr.replace(/^socks:\/\//, 'socks5://');
            try {
                const url = new URL(urlStr);
                return {
                    type: 'socks5',
                    host: url.hostname,
                    port: parseInt(url.port) || 1080,
                    username: url.username ? decodeURIComponent(url.username) : '',
                    password: url.password ? decodeURIComponent(url.password) : ''
                };
            } catch (e) {
                return null;
            }
        }

        // 解析 HTTP
        if (serverStr.startsWith('http://') || serverStr.startsWith('https://')) {
            try {
                const url = new URL(serverStr);
                return {
                    type: 'http',
                    host: url.hostname,
                    port: parseInt(url.port) || (serverStr.startsWith('https://') ? 443 : 80),
                    username: url.username ? decodeURIComponent(url.username) : '',
                    password: url.password ? decodeURIComponent(url.password) : ''
                };
            } catch (e) {
                return null;
            }
        }

        // 处理 IPv6 格式 [host]:port
        if (serverStr.startsWith('[')) {
            const closeBracket = serverStr.indexOf(']');
            if (closeBracket > 0) {
                const host = serverStr.substring(1, closeBracket);
                const rest = serverStr.substring(closeBracket + 1);
                if (rest.startsWith(':')) {
                    const port = parseInt(rest.substring(1), 10);
                    if (!isNaN(port) && port > 0 && port <= 65535) {
                        return { type: 'direct', host, port };
                    }
                }
                return { type: 'direct', host, port: 443 };
            }
        }

        const lastColonIndex = serverStr.lastIndexOf(':');

        if (lastColonIndex > 0) {
            const host = serverStr.substring(0, lastColonIndex);
            const portStr = serverStr.substring(lastColonIndex + 1);
            const port = parseInt(portStr, 10);

            if (!isNaN(port) && port > 0 && port <= 65535) {
                return { type: 'direct', host, port };
            }
        }

        return { type: 'direct', host: serverStr, port: 443 };
    }

    /**
     * 检查是否为测速站点
     */
    isSpeedTestSite(hostname) {
        const speedTestDomains = [
            'speedtest.net', 'fast.com', 'speedtest.cn',
            'speed.cloudflare.com', 'ovo.speedtestcustom.com'
        ];

        if (speedTestDomains.includes(hostname)) {
            return true;
        }

        for (const domain of speedTestDomains) {
            if (hostname.endsWith('.' + domain) || hostname === domain) {
                return true;
            }
        }
        return false;
    }

    /**
     * 格式化标识符
     */
    formatIdentifier(arr, offset = 0) {
        const hex = [...arr.slice(offset, offset + 16)]
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
    }

    /**
     * Base64转Array
     */
    base64ToArray(b64Str) {
        if (!b64Str) return { error: null };
        try {
            const binaryString = atob(b64Str.replace(/-/g, '+').replace(/_/g, '/'));
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return { earlyData: bytes.buffer, error: null };
        } catch (error) {
            return { error };
        }
    }

    /**
     * 安静关闭Socket
     */
    closeSocketQuietly(socket) {
        try {
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CLOSING) {
                socket.close();
            }
        } catch (error) {
            // 忽略错误
        }
    }

    /**
     * 连接到SOCKS5代理
     */
    async connectToSocks5(proxyConfig, targetHost, targetPort, initialData) {
        const { host, port, username, password } = proxyConfig;
        const socket = connect({ hostname: host, port: port });
        const writer = socket.writable.getWriter();
        const reader = socket.readable.getReader();

        try {
            const authMethods = username && password ?
                new Uint8Array([0x05, 0x02, 0x00, 0x02]) :
                new Uint8Array([0x05, 0x01, 0x00]);

            await writer.write(authMethods);
            const methodResponse = await reader.read();
            if (methodResponse.done || methodResponse.value.byteLength < 2) {
                throw new Error('SOCKS5 method selection failed');
            }

            const selectedMethod = new Uint8Array(methodResponse.value)[1];
            if (selectedMethod === 0x02) {
                if (!username || !password) {
                    throw new Error('SOCKS5 requires authentication');
                }
                // 用户名密码认证逻辑...
            } else if (selectedMethod !== 0x00) {
                throw new Error(`Unsupported SOCKS5 auth method: ${selectedMethod}`);
            }

            await writer.write(initialData);
            writer.releaseLock();
            reader.releaseLock();
            return socket;
        } catch (error) {
            writer.releaseLock();
            reader.releaseLock();
            throw error;
        }
    }

    /**
     * 连接到HTTP代理
     */
    async connectToHTTP(proxyConfig, targetHost, targetPort, initialData) {
        const { host, port, username, password } = proxyConfig;
        const socket = connect({ hostname: host, port: port });
        const writer = socket.writable.getWriter();
        const reader = socket.readable.getReader();

        try {
            let connectRequest = `CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\n`;
            connectRequest += `Host: ${targetHost}:${targetPort}\r\n`;

            if (username && password) {
                const auth = btoa(`${username}:${password}`);
                connectRequest += `Proxy-Authorization: Basic ${auth}\r\n`;
            }

            connectRequest += `User-Agent: Mozilla/5.0\r\n`;
            connectRequest += `Connection: keep-alive\r\n`;
            connectRequest += '\r\n';

            await writer.write(new TextEncoder().encode(connectRequest));
            // 处理HTTP响应...

            await writer.write(initialData);
            writer.releaseLock();
            reader.releaseLock();
            return socket;
        } catch (error) {
            try { writer.releaseLock(); } catch (e) {}
            try { reader.releaseLock(); } catch (e) {}
            try { socket.close(); } catch (e) {}
            throw error;
        }
    }
}