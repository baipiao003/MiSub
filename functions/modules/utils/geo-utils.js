/**
 * 地理识别工具模块
 * 提供节点地区识别和相关功能
 */

/**
 * 地区关键词映射表
 * 支持多语言地区识别
 */
export const REGION_KEYWORDS = {
    '香港': ['HK', '香港', 'Hong Kong', 'HongKong', 'HongKong', 'Hong Kong'],
    '台湾': ['TW', '台湾', 'Taiwan', 'Taipei', 'Taipei'],
    '新加坡': ['SG', '新加坡', 'Singapore'],
    '日本': ['JP', '日本', 'Japan', 'Tokyo', 'Osaka', 'Tokyo', 'Osaka', 'Fukuoka', 'Yokohama'],
    '美国': ['US', '美国', 'USA', 'United States', 'America', 'Los Angeles', 'New York', 'San Francisco', 'Seattle', 'Chicago'],
    '韩国': ['KR', '韩国', 'Korea', 'Seoul', 'Seoul'],
    '英国': ['UK', '英国', 'Britain', 'London', 'London', 'Manchester'],
    '德国': ['DE', '德国', 'Germany', 'Frankfurt', 'Frankfurt', 'Berlin', 'Munich'],
    '法国': ['FR', '法国', 'France', 'Paris', 'Paris', 'Lyon', 'Marseille'],
    '加拿大': ['CA', '加拿大', 'Canada', 'Toronto', 'Vancouver', 'Montreal'],
    '澳大利亚': ['AU', '澳大利亚', 'Australia', 'Sydney', 'Melbourne', 'Brisbane', 'Perth'],
    '荷兰': ['NL', '荷兰', 'Netherlands', 'Amsterdam', 'Amsterdam', 'Rotterdam'],
    '俄罗斯': ['RU', '俄罗斯', 'Russia', 'Moscow', 'Moscow', 'Saint Petersburg'],
    '印度': ['IN', '印度', 'India', 'Mumbai', 'Delhi', 'Bangalore'],
    '土耳其': ['TR', '土耳其', 'Turkey', 'Istanbul', 'Istanbul', 'Ankara'],
    '马来西亚': ['MY', '马来西亚', 'Malaysia', 'Kuala Lumpur'],
    '泰国': ['TH', '泰国', 'Thailand', 'Bangkok', 'Bangkok', 'Pattaya'],
    '越南': ['VN', '越南', 'Vietnam', 'Ho Chi Minh City', 'Hanoi'],
    '菲律宾': ['PH', '菲律宾', 'Philippines', 'Manila', 'Cebu'],
    '印尼': ['ID', '印尼', 'Indonesia', 'Jakarta', 'Surabaya', 'Bandung'],
    '瑞士': ['CH', '瑞士', 'Switzerland', 'Zurich', 'Geneva'],
    '意大利': ['IT', '意大利', 'Italy', 'Rome', 'Milan', 'Naples'],
    '西班牙': ['ES', '西班牙', 'Spain', 'Madrid', 'Barcelona'],
    '巴西': ['BR', '巴西', 'Brazil', 'São Paulo', 'Rio de Janeiro'],
    '阿根廷': ['AR', '阿根廷', 'Argentina', 'Buenos Aires'],
    '墨西哥': ['MX', '墨西哥', 'Mexico', 'Mexico City'],
    '南非': ['ZA', '南非', 'South Africa', 'Johannesburg', 'Cape Town'],
    '埃及': ['EG', '埃及', 'Egypt', 'Cairo'],
    '以色列': ['IL', '以色列', 'Israel', 'Tel Aviv', 'Jerusalem'],
    '阿联酋': ['AE', '阿联酋', 'UAE', 'Dubai', 'Abu Dhabi', 'Sharjah'],
    '沙特': ['SA', '沙特', 'Saudi Arabia', 'Riyadh', 'Jeddah'],
    '印度尼西亚': ['ID', '印度尼西亚', 'Indonesia', 'Jakarta', 'Surabaya'],
    '波兰': ['PL', '波兰', 'Poland', 'Warsaw', 'Krakow'],
    '捷克': ['CZ', '捷克', 'Czech Republic', 'Prague'],
    '匈牙利': ['HU', '匈牙利', 'Hungary', 'Budapest'],
    '罗马尼亚': ['RO', '罗马尼亚', 'Romania', 'Bucharest'],
    '保加利亚': ['BG', '保加利亚', 'Bulgaria', 'Sofia'],
    '希腊': ['GR', '希腊', 'Greece', 'Athens', 'Thessaloniki'],
    '葡萄牙': ['PT', '葡萄牙', 'Portugal', 'Lisbon', 'Porto'],
    '瑞典': ['SE', '瑞典', 'Sweden', 'Stockholm', 'Gothenburg'],
    '挪威': ['NO', '挪威', 'Norway', 'Oslo', 'Bergen'],
    '丹麦': ['DK', '丹麦', 'Denmark', 'Copenhagen', 'Aarhus'],
    '芬兰': ['FI', '芬兰', 'Finland', 'Helsinki'],
    '奥地利': ['AT', '奥地利', 'Austria', 'Vienna', 'Salzburg']
};

/**
 * 从节点名称中识别地区
 * @param {string} nodeName - 节点名称
 * @returns {string} 识别出的地区，如未识别返回"其他"
 */
export function extractNodeRegion(nodeName) {
    if (!nodeName || typeof nodeName !== 'string') {
        return '其他';
    }

    const normalizedNodeName = nodeName.toLowerCase();

    // 遍历所有地区关键词
    for (const [regionName, keywords] of Object.entries(REGION_KEYWORDS)) {
        for (const keyword of keywords) {
            if (normalizedNodeName.includes(keyword.toLowerCase())) {
                return regionName;
            }
        }
    }

    return '其他';
}

/**
 * 获取所有支持的地区列表
 * @returns {string[]} 支持的地区名称数组
 */
export function getSupportedRegions() {
    return Object.keys(REGION_KEYWORDS);
}

/**
 * 获取指定地区的所有关键词
 * @param {string} region - 地区名称
 * @returns {string[]} 该地区的所有关键词，如地区不存在返回空数组
 */
export function getRegionKeywords(region) {
    return REGION_KEYWORDS[region] || [];
}

/**
 * 检查节点名称是否包含指定地区
 * @param {string} nodeName - 节点名称
 * @param {string} region - 要检查的地区
 * @returns {boolean} 是否包含该地区
 */
export function containsRegion(nodeName, region) {
    if (!nodeName || !region || !REGION_KEYWORDS[region]) {
        return false;
    }

    const normalizedNodeName = nodeName.toLowerCase();
    const keywords = REGION_KEYWORDS[region];

    for (const keyword of keywords) {
        if (normalizedNodeName.includes(keyword.toLowerCase())) {
            return true;
        }
    }

    return false;
}

/**
 * 获取节点的详细信息（协议、名称、地区等）
 * @param {string} nodeUrl - 节点URL
 * @returns {Object} 节点详细信息
 */
export function parseNodeInfo(nodeUrl) {
    if (!nodeUrl || typeof nodeUrl !== 'string') {
        return {
            protocol: 'unknown',
            name: '未命名节点',
            region: '其他',
            url: nodeUrl
        };
    }

    // 提取协议
    const protocolMatch = nodeUrl.match(/^(.*?):\/\//);
    const protocol = protocolMatch ? protocolMatch[1].toLowerCase() : 'unknown';

    // 提取节点名称
    let nodeName = '';
    const hashIndex = nodeUrl.lastIndexOf('#');
    if (hashIndex !== -1) {
        try {
            nodeName = decodeURIComponent(nodeUrl.substring(hashIndex + 1));
        } catch (e) {
            nodeName = nodeUrl.substring(hashIndex + 1);
        }
    }

    // 如果没有名称，从URL生成一个
    if (!nodeName) {
        // 从URL中提取一些信息作为名称
        const urlWithoutProtocol = nodeUrl.replace(/^[^:]*:\/\/\/\//, '');
        const urlParts = urlWithoutProtocol.split(/[:@?#]/);
        nodeName = urlParts[0] || '未命名节点';
    }

    // 识别地区
    const region = extractNodeRegion(nodeName);

    return {
        protocol,
        name: nodeName,
        region,
        url: nodeUrl
    };
}

/**
 * 统计节点地区分布
 * @param {Array} nodes - 节点数组
 * @returns {Object} 地区统计信息
 */
export function calculateRegionStats(nodes) {
    const stats = {};
    const total = nodes.length;

    nodes.forEach(node => {
        const region = extractNodeRegion(node.name || '');
        stats[region] = (stats[region] || 0) + 1;
    });

    // 添加百分比信息
    for (const [region, count] of Object.entries(stats)) {
        stats[region] = {
            count,
            percentage: Math.round((count / total) * 100)
        };
    }

    return stats;
}