# 服务暂停功能使用指南

## 功能概述

已为您的应用添加了全局服务暂停功能，可以在需要维护或紧急情况下快速暂停所有用户操作。

## 功能特性

- ✅ 全局覆盖层，阻止所有用户交互
- ✅ 可自定义暂停消息
- ✅ 支持中英文双语
- ✅ 美观的UI设计
- ✅ 状态持久化存储

## 使用方法

### 方法一：通过代码控制

```typescript
import { useCommonStore } from '@/store';

// 暂停服务
const { setServicePaused } = useCommonStore();
setServicePaused(true, '系统维护中，预计30分钟后恢复');

// 恢复服务
setServicePaused(false);
```

### 方法二：使用控制面板组件

在需要的地方引入控制面板组件：

```tsx
import { ServicePauseControl } from '@/components/ServicePauseControl';

// 在管理页面中使用
<ServicePauseControl />
```

## 组件说明

### ServicePauseOverlay
- 全局覆盖层组件
- 自动在 `app/layout.tsx` 中集成
- 当 `isServicePaused` 为 `true` 时显示

### ServicePauseControl
- 管理控制面板
- 可以暂停/恢复服务
- 可以自定义暂停消息

## 状态管理

服务暂停状态存储在 `useCommonStore` 中：

```typescript
interface CommonState {
  isServicePaused: boolean;           // 是否暂停服务
  servicePauseMessage: string;        // 暂停消息
  setServicePaused: (paused: boolean, message?: string) => void;
}
```

## 多语言支持

已添加中英文翻译：

- 中文：`servicePause.title` = "服务维护中"
- 英文：`servicePause.title` = "Service Maintenance"

## 使用场景

1. **系统维护**：定期维护时暂停服务
2. **紧急情况**：发现严重bug时快速暂停
3. **升级部署**：新版本部署时临时暂停
4. **流量控制**：高并发时临时限流

## 注意事项

- 暂停状态会持久化存储，刷新页面后仍然有效
- 覆盖层使用最高z-index (9999)，确保覆盖所有内容
- 暂停期间用户无法进行任何操作
- 建议在管理后台或开发工具中集成控制面板

## 快速启用

如需立即启用服务暂停，可以在浏览器控制台执行：

```javascript
// 暂停服务
window.__NEXT_DATA__.props.pageProps = window.__NEXT_DATA__.props.pageProps || {};
window.__NEXT_DATA__.props.pageProps.setServicePaused?.(true, '服务维护中');

// 或在React组件中
const { setServicePaused } = useCommonStore();
setServicePaused(true, '服务维护中');
```
