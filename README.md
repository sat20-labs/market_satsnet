# Sat20 Market

基于 Next.js 14 构建的比特币资产交易平台，支持 LaunchPool、Swap、Limit Order、DAO 等功能。

## 技术栈

- **Next.js 14** (App Router) + **React 19**
- **TypeScript** + **Tailwind CSS 4**
- **NextUI v2** + **shadcn/ui** + **Framer Motion**
- **Zustand** + **SWR** + **React Query**
- **Bun** 包管理器

## 开发

```bash
bun install        # 安装依赖
bun dev            # 启动开发环境 (端口 3002)
bun build          # 构建生产版本
bun build:test     # 构建测试环境
bun lint           # 代码检查
```

## 部署

- **测试环境**：提交代码到 GitHub 自动触发部署
- **生产环境**：`bun run deploy`

## 项目结构

```
market_satsnet/
├── app/                    # Next.js App Router 页面
│   ├── launchpool/         # 发射池
│   ├── swap/               # 交易
│   ├── market/             # 市场
│   ├── limitOrder/         # 限价单
│   └── dao/                # DAO
├── components/             # 可复用组件
│   ├── ui/                 # 基础 UI 组件 (shadcn/ui)
│   ├── launchpool/         # 发射池组件
│   ├── market/             # 市场组件
│   └── account/            # 账户组件
├── domain/                 # 领域层 (DDD)
├── store/                  # 状态管理 (Zustand)
├── lib/                    # 工具库 & Hooks
├── types/                  # TypeScript 类型
├── locales/                # 国际化 (中/英)
└── infrastructure/         # 基础设施层
```
