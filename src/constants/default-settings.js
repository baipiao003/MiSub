/**
 * 默认设置常量
 * @author MiSub Team
 */

export const DEFAULT_SETTINGS = {
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

export const DEFAULT_NODE_FORM = {
    name: '',
    url: '',
    enabled: true
};

export const DEFAULT_PROFILE_FORM = {
    name: '',
    customId: '',
    subConverter: '',
    subConfig: '',
    subscriptions: [],
    manualNodes: [],
    enabled: true,
    prefixSettings: {
        enableManualNodes: true,
        enableSubscriptions: true,
        manualNodePrefix: '手动节点'
    }
};