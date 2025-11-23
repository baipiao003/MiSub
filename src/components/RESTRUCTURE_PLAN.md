# Components 目录结构重组方案

## 📁 新的目录结构

```
src/components/
├── index.js                    # 主导出文件
├── layout/                     # 布局相关组件
│   ├── index.js
│   ├── Header.vue
│   ├── Footer.vue
│   ├── AdaptiveGrid.vue
│   └── DashboardSkeleton.vue
│
├── features/                   # 功能性组件
│   ├── index.js
│   ├── Dashboard/
│   │   ├── Dashboard.vue
│   │   ├── DashboardContainer.vue
│   │   ├── SaveIndicator.vue
│   │   └── Overview.vue
│   ├── PWADevTools.vue
│   ├── PWAInstallPrompt.vue
│   ├── PWAUpdatePrompt.vue
│   └── ThemeToggle.vue
│
├── ui/                         # 基础UI组件
│   ├── index.js
│   ├── Card.vue
│   ├── LoadingSpinner.vue
│   ├── EmptyState.vue
│   ├── StatusIndicator.vue
│   ├── FluidButton.vue
│   ├── ProgressiveDisclosure.vue
│   ├── Toast.vue
│   └── SkeletonLoader.vue
│
├── forms/                      # 表单组件
│   ├── index.js
│   ├── Modal.vue
│   └── SmartSearch.vue
│
├── modals/                     # 模态框组件
│   ├── index.js
│   ├── Login.vue
│   ├── SettingsModal.vue
│   ├── ProfileModal.vue
│   ├── BulkImportModal.vue
│   ├── SubscriptionImportModal.vue
│   └── NodePreview/
│       ├── index.js
│       ├── NodePreviewModal.vue
│       ├── NodePreviewContainer.vue
│       ├── NodePreviewHeader.vue
│       ├── NodeFilterControls.vue
│       ├── NodeListView.vue
│       ├── NodeCardView.vue
│       ├── NodePagination.vue
│       └── useNodePreview.js
│
├── nodes/                      # 节点相关组件
│   ├── index.js
│   ├── ManualNodeCard.vue
│   ├── ManualNodeList.vue
│   └── ManualNodePanel.vue
│
├── subscriptions/              # 订阅相关组件
│   ├── index.js
│   └── SubscriptionPanel.vue
│
├── profiles/                   # 配置文件相关组件
│   ├── index.js
│   ├── ProfileCard.vue
│   ├── ProfilePanel.vue
│   └── RightPanel.vue
│
├── shared/                     # 共享组件库 (已完成)
│   ├── index.js
│   ├── FormModal.vue
│   ├── DataGrid.vue
│   ├── FilterPanel.vue
│   └── DragDropList.vue
│
└── charts/                     # 图表组件
    ├── index.js
    └── (existing chart components)
```

## 📋 分类说明

### layout/ - 布局组件
- 负责页面整体布局和结构
- 包括头部、尾部、网格布局等

### features/ - 功能组件
- 具体业务功能的组件
- Dashboard、PWA相关功能等

### ui/ - 基础UI组件
- 通用UI元素和展示组件
- 按钮、卡片、加载状态等

### forms/ - 表单组件
- 表单相关的通用组件
- 输入框、搜索框等

### modals/ - 模态框组件
- 各种弹窗和对话框
- 按功能进一步细分

### nodes/ - 节点组件
- 节点管理相关的专用组件

### subscriptions/ - 订阅组件
- 订阅管理相关的专用组件

### profiles/ - 配置文件组件
- 配置文件管理相关的专用组件

### shared/ - 共享组件库
- 高度可复用的通用组件
- 跨功能使用的组件

## 🎯 重构目标

1. **清晰的职责分离** - 每个目录都有明确的职责范围
2. **更好的可维护性** - 相关组件集中管理
3. **提升开发效率** - 快速定位需要的组件
4. **支持代码分割** - 按功能模块进行懒加载
5. **团队协作友好** - 清晰的目录结构便于多人开发