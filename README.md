# 三句记忆卡

三句记忆卡是一个个人使用的极简记忆整理应用。它把一条记录压缩成三句话，用来保存经历、复盘思考、整理情绪和回顾灵感。

如果你想看这个 demo 是怎么从一段真实对话里一步步手搓出来的，可以直接看 [三句记忆卡-vibe-coding教程.md](三句记忆卡-vibe-coding教程.md)。

## 项目特点

- 三句话记录：每张卡固定为三句，降低记录成本。
- 持久化存储：Vercel 生产环境使用 Redis 保存数据，关闭后重新打开数据仍然保留。
- 快速回顾：支持搜索、筛选、随机回顾、标记已回顾。
- 个人优先：不包含登录、多用户、远程同步和权限控制。

## 技术栈

### 前端

- React 19
- TypeScript
- Vite
- 原生 CSS

前端负责页面展示、表单编辑、搜索筛选、卡片详情和回顾交互。

### 后端

- Node.js 22
- Vercel Serverless Functions
- Upstash Redis

后端提供 REST 接口，负责卡片的增删改查和已回顾状态更新。

### 数据存储

- Redis：生产环境持久化存储
- 本地开发回退文件：`.data/cards.json`

当前主存储是 Vercel 连接的 Redis，`.data/cards.json` 仅用于本地开发回退。

### 迁移说明

这个项目最开始尝试接 Upstash Redis，但最终在 Vercel 控制台里绑定到的是 Redis 集成，项目环境变量注入的是 `REDIS_URL`。
因此代码和文档都统一改成了直接使用 Redis 连接串，而不是 Upstash 的 REST 环境变量。

## 功能说明

- 新建卡片：输入标题、三句话、标签、来源类型和重要程度。
- 编辑卡片：修改已有内容并保存。
- 删除卡片：移除不再需要的记录。
- 搜索筛选：按关键字、来源类型和重要程度过滤。
- 随机回顾：从当前卡片里随机抽取一条进行回顾。
- 标记回顾：记录一张卡是否已经回看过。
- 相似卡片：根据标签和重要程度展示关联卡片。

## 目录结构

```text
.
├─ index.html
├─ api/
│  ├─ health.js
│  ├─ cards/
│  │  ├─ index.js
│  │  ├─ [id].js
│  │  └─ [id]/review.js
│  └─ _lib/
│     └─ cards-store.js
├─ package.json
├─ src/
│  ├─ App.tsx
│  ├─ api.ts
│  ├─ main.tsx
│  ├─ storage.ts
│  ├─ styles.css
│  └─ types.ts
└─ README.md
```

## Vercel 部署

这个项目适合部署成一个 Vercel 项目，前端和 API 都在同一个平台上。

### 最短部署清单

1. 在 Vercel 创建一个新项目。
2. 导入这个仓库。
3. 保持默认框架识别，让 Vercel 自动部署前端和 `api/` 下的 Serverless Functions。
4. 在同一个项目里绑定 Redis 集成，让 Vercel 注入 `REDIS_URL`。
5. 部署完成后，直接打开 Vercel 分配的站点地址。

### 需要确认的配置

- 前端通过相对路径 `/api` 调用后端，不需要额外配置跨域。
- 生产环境必须绑定 Redis，否则只会退回本地 JSON 备份模式。
- 本地开发不需要单独启动后端进程。

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发模式

```bash
npm run dev
```

开发模式会同时提供前端页面和本地 `/api` 接口，默认访问地址是 `http://localhost:5173`。

### 3. 打包构建

```bash
npm run build
```

### 说明

- 前端通过相对路径 `/api` 调用后端，所以部署到 Vercel 后不需要额外配置跨域。
- 旧的 Express / SQLite 方案已经被 Serverless API 方案替换。
- 生产环境数据保存在 Redis，开发环境则使用本地 JSON 回退。

## REST 接口

后端当前提供这些接口：

- `GET /api/health`：健康检查
- `GET /api/cards`：获取全部卡片
- `POST /api/cards`：创建卡片
- `PUT /api/cards/:id`：更新卡片
- `PATCH /api/cards/:id/review`：标记已回顾
- `DELETE /api/cards/:id`：删除卡片

## 数据持久化说明

项目在 Vercel 上通过 Redis 保存卡片数据，重启和重新部署后仍然保留。

如果你想备份数据，可以从 Redis 导出当前卡片列表；本地开发时也可以直接复制 `.data/cards.json`。

## 后续可扩展方向

- 导出 Markdown 或 JSON 备份
- 更完善的标签体系
- 周报和月报回顾
- 更强的相似卡片推荐
- 语音输入或 AI 辅助总结

## 说明

这个项目当前定位为个人本地应用，重点是轻量记录和快速回顾，而不是复杂协作平台。