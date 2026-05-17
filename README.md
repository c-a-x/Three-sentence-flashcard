# 三句记忆卡

三句记忆卡是一个个人使用的极简记忆整理应用。它把一条记录压缩成三句话，用来保存经历、复盘思考、整理情绪和回顾灵感。

## 项目特点

- 三句话记录：每张卡固定为三句，降低记录成本。
- 持久化存储：Vercel 生产环境使用 Vercel KV 保存数据，关闭后重新打开数据仍然保留。
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
- Vercel KV

后端提供 REST 接口，负责卡片的增删改查和已回顾状态更新。

### 数据存储

- Vercel KV：生产环境持久化存储
- 本地开发回退文件：`.data/cards.json`
- 迁移遗留文件：`server/data/cards.json`

当前主存储是 Vercel KV，`cards.json` 用于首次迁移和本地回退。

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
├─ vercel.json
└─ README.md
```

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 启动后端

```bash
npm run dev
```

开发环境里，Vite 会同时提供前端和 `/api` 的本地模拟实现，方便直接调试。

### 3. 启动前端

```bash
npm run dev -- --host 0.0.0.0
```

默认访问地址：`http://localhost:5173`

### 4. 打包构建

```bash
npm run build
```

## Vercel 部署

这个项目适合部署成一个 Vercel 项目，前端和 API 都在同一个平台上。

### 方式一：使用仓库直接导入 Vercel

1. 在 Vercel 创建一个新项目。
2. 导入这个仓库。
3. 保持默认的框架识别，让 Vercel 构建 `dist` 静态前端并部署 `api/` 目录下的函数。
4. 在同一个 Vercel 项目里添加 Vercel KV。

### 方式二：补充环境变量

- 如果你在本地调试，可以直接运行 `npm run dev`。
- 生产环境需要在 Vercel 项目里绑定 Vercel KV，这样卡片数据才会持久化。
- 如果不绑定 Vercel KV，应用会退回到本地 JSON 备份模式，适合开发，不适合生产。

### 说明

- 前端通过相对路径 `/api` 调用后端，所以部署到 Vercel 后不需要额外配置跨域。
- 旧的 Express / SQLite 方案已经被 Serverless API 方案替换。
- 本地开发时不需要单独启动后端进程。

## REST 接口

后端当前提供这些接口：

- `GET /api/health`：健康检查
- `GET /api/cards`：获取全部卡片
- `POST /api/cards`：创建卡片
- `PUT /api/cards/:id`：更新卡片
- `PATCH /api/cards/:id/review`：标记已回顾
- `DELETE /api/cards/:id`：删除卡片

## 数据持久化说明

项目在 Vercel 上通过 KV 保存卡片数据，重启和重新部署后仍然保留。

如果你想备份数据，可以从 Vercel KV 导出当前卡片列表；本地开发时也可以直接复制 `.data/cards.json`。

## 后续可扩展方向

- 导出 Markdown 或 JSON 备份
- 更完善的标签体系
- 周报和月报回顾
- 更强的相似卡片推荐
- 语音输入或 AI 辅助总结

## 说明

这个项目当前定位为个人本地应用，重点是轻量记录和快速回顾，而不是复杂协作平台。