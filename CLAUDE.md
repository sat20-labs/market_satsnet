# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 提供个人开发偏好指导。

全程以中文和我交流，记住当前时间是2025年8月
## 开发风格偏好

### 语言规范
- **回答语言**: 中文
- **代码注释**: 中文
- **代码命名**: 英文（变量、函数、类名）
- **文档语言**: 中文为主，技术术语保留英文

### 架构原则
- **DDD设计**: 领域驱动设计，清晰分层
- **高内聚低耦合**: 模块独立，依赖最小化
- **个人开发优化**: 简洁高效，易于维护

### 文档规范
- **项目文档**: 统一放在 `doc/` 目录
- **API文档**: `doc/api.md`
- **架构说明**: `doc/architecture.md`
- **部署指南**: `doc/deploy.md`

### 技术栈偏好
- **前端**: React + Next.js
- **后端**: Cloudflare Workers + Supabase
- **数据库**: Supabase (PostgreSQL)
- **桌面**: Tauri
- **ORM**: Prisma
- **样式**: Tailwind CSS + shadcn/ui
- **部署**: Cloudflare Pages/Workers

### 代码规范
- **函数**: 单一职责，纯函数优先
- **命名**: 英文语义化命名，清晰表达意图
- **模块**: 按功能划分，避免循环依赖
- **配置**: 环境变量统一管理

### 个人开发优化
- **快速启动**: 一键开发环境
- **最小依赖**: 避免过度工程化
- **自动化**: 构建、测试、部署自动化
- **可移植**: 跨平台支持

### 常用命令模板
```bash
# 开发
bun dev              # 启动开发环境
bun build           # 构建项目
bun test            # 运行测试
bun lint            # 代码检查

# 文档
bun doc:build       # 构建文档
bun doc:serve       # 本地文档服务
```

### 质量检查
- **代码审查**: 自我代码审查
- **测试覆盖**: 核心功能全覆盖
- **性能监控**: 开发时性能检查
- **安全检查**: 依赖安全扫描

filesystem: npx -y @modelcontextprotocol/server-filesystem /Users/icehugh/Documents /Users/icehugh/workspace /Users/icehugh/Desktop - ✓ Connected
fetch: npx -y @kazuph/mcp-fetch - ✓ Connected
memory: npx -y @modelcontextprotocol/server-memory - ✓ Connected
thinking: npx -y @modelcontextprotocol/server-sequential-thinking - ✓ Connected
context-mcp-server: uvx context-mcp-server - ✓ Connected
context7: https://mcp.context7.com/mcp (HTTP) - ✓ Connected