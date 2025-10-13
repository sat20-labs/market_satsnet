# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

全程以中文和我交流，记住当前时间是2025年8月

## 项目概述

这是一个基于 Next.js 14 构建的比特币资产交易平台 **Sat20 Market**，使用 App Router 架构和现代化的技术栈。

## 开发命令

### 核心开发命令
```bash
bun dev              # 启动开发环境 (端口 3002)
bun build           # 构建生产版本 (静态导出)
bun build:test      # 构建测试环境
bun start           # 启动生产服务器
bun deploy          # 执行部署脚本
bun lint            # 代码检查
```

### 环境配置
- 开发环境端口：3002
- 构建输出目录：`out/`
- 静态站点生成：`output: 'export'`

## 技术架构

### 核心框架
- **Next.js 14.2.31** - App Router 架构
- **React 19.1.1** - 最新版本 React
- **TypeScript 5.0.4** - 类型安全

### UI 技术栈
- **NextUI v2.6.11** - 主要 UI 组件库
- **shadcn/ui** - 基于 Radix UI 的组件系统
- **Tailwind CSS 4.1.11** - 原子化 CSS
- **Framer Motion 11.18.2** - 动画库
- **lucide-react** - 图标库

### 状态管理
- **Zustand 4.5.7** - 客户端状态管理
- **SWR 2.3.4** - 数据获取和缓存
- **React Query 5.84.1** - 服务器状态管理
- **localforage** - 本地存储持久化

### 比特币生态
- **@sat20/btc-connect 1.4.62** - 比特币连接 SDK
- **WebAssembly 支持** - bitcore-lib 集成

## 项目结构

```
market_satsnet/
├── app/                    # Next.js App Router 页面
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 首页
│   ├── swap/              # 交易功能
│   ├── market/            # 市场功能
│   ├── limitOrder/        # 限价单
│   ├── launchpool/        # 发起池
│   └── providers.tsx      # 全局提供者
├── components/            # 可复用组件
│   ├── ui/               # 基础 UI 组件 (shadcn/ui)
│   ├── satoshinet/       # 比特币网络相关
│   ├── market/           # 市场组件
│   ├── account/          # 账户组件
│   └── launchpool/       # 发起池组件
├── domain/               # 领域层 (DDD架构)
│   ├── services/         # 领域服务
│   ├── ammAdapter.ts     # AMM适配器
│   └── ammPool.ts        # AMM池模型
├── store/                # 状态管理 (Zustand)
│   ├── common.ts         # 通用状态
│   ├── asset.ts          # 资产状态
│   ├── buy-store.ts      # 买入状态
│   └── sell-store.ts     # 卖出状态
├── lib/                  # 工具库
│   ├── hooks/            # 自定义 Hooks
│   ├── utils/            # 工具函数
│   └── constants.ts      # 常量定义
├── types/                # TypeScript 类型定义
├── locales/              # 国际化文件 (中英文)
├── api/                  # API 路由
└── infrastructure/       # 基础设施层
```

## 架构原则

### DDD (领域驱动设计)
- 清晰的分层架构，domain/ 层包含业务逻辑
- 领域模型与基础设施分离
- 服务层封装复杂业务逻辑

### 组件化设计
- 业务组件与 UI 组件分离 (参考 README.md 中的 TakeOrderContainer/TakeOrderUI 模式)
- 基于 shadcn/ui 的设计系统
- 高度可复用的组件架构

### 状态管理策略
- Zustand 管理客户端状态
- SWR/React Query 管理服务器状态
- 本地存储持久化

## 国际化支持

- 基于 react-i18next 的完整国际化方案
- 支持中英文切换
- 语言检测：`i18next-browser-languagedetector`

## 开发规范

### 语言规范
- **回答语言**: 中文
- **代码注释**: 中文
- **代码命名**: 英文（变量、函数、类名）
- **文档语言**: 中文为主，技术术语保留英文

### 代码规范
- 函数单一职责，纯函数优先
- 英文语义化命名，清晰表达意图
- 按功能划分模块，避免循环依赖
- 环境变量统一管理

### Git 工作流
- 使用 Husky 进行 Git hooks 管理
- lint-staged 进行提交前检查
- 版本号自动更新 (updateVersion.js)

## 特殊配置

### Next.js 配置
- 静态导出模式：`output: 'export'`
- 图片优化已禁用：`unoptimized: true`
- WebAssembly 支持：bitcore-lib 别名配置

### TypeScript 配置
- 严格模式启用
- 路径别名：`@/*` 映射到项目根目录
- 增量编译：`incremental: true`

## 现有文档资源

- **README.md** - 项目概述和组件使用示例
- **docs/agile-readme.md** - 敏捷开发工作流程
- **REFETCH_OPTIMIZATION.md** - 数据获取优化指南
- **SERVICE_PAUSE_GUIDE.md** - 服务暂停控制指南

## Cursor 集成

项目配置了完整的 Cursor 开发环境：
- **.cursor/rules/** - 代码规则和最佳实践
- **.cursor/templates/** - 代码模板
- 敏捷开发工作流集成

## 质量保证

- TypeScript 严格模式
- ESLint 规则检查 (Next.js 配置)
- Prettier 代码格式化
- Git hooks 自动化检查
- 多环境构建支持

filesystem: npx -y @modelcontextprotocol/server-filesystem /Users/icehugh/Documents /Users/icehugh/workspace /Users/icehugh/Desktop - ✓ Connected
fetch: npx -y @kazuph/mcp-fetch - ✓ Connected
memory: npx -y @modelcontextprotocol/server-memory - ✓ Connected
thinking: npx -y @modelcontextprotocol/server-sequential-thinking - ✓ Connected
context-mcp-server: uvx context-mcp-server - ✓ Connected
context7: https://mcp.context7.com/mcp (HTTP) - ✓ Connected