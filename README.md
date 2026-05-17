# 三句记忆卡

三句记忆卡是一个个人使用的极简记忆整理应用。它把一条记录压缩成三句话，用来保存经历、复盘思考、整理情绪和回顾灵感。

## 项目特点

- 三句话记录：每张卡固定为三句，降低记录成本。
- 本地持久化：使用 SQLite 保存数据，关闭后重新打开数据仍然保留。
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
- Express
- CORS
- Node 内置 SQLite API

后端提供 REST 接口，负责卡片的增删改查和已回顾状态更新。

### 数据存储

- SQLite 数据库文件：`server/data/cards.db`
- 迁移遗留文件：`server/data/cards.json`

当前主存储是 SQLite，`cards.json` 仅用于早期迁移兼容。

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
├─ package.json
├─ server/
│  ├─ index.js
│  └─ data/
│     └─ cards.db
├─ src/
│  ├─ App.tsx
│  ├─ api.ts
│  ├─ main.tsx
│  ├─ storage.ts
│  ├─ styles.css
│  └─ types.ts
└─ README.md
```

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 启动后端

```bash
npm run server
```

默认监听地址：`http://localhost:3001`

### 3. 启动前端

```bash
npm run dev -- --host 0.0.0.0
```

默认访问地址：`http://localhost:5173`

### 4. 打包构建

```bash
npm run build
```

## REST 接口

后端当前提供这些接口：

- `GET /api/health`：健康检查
- `GET /api/cards`：获取全部卡片
- `POST /api/cards`：创建卡片
- `PUT /api/cards/:id`：更新卡片
- `PATCH /api/cards/:id/review`：标记已回顾
- `DELETE /api/cards/:id`：删除卡片

## 数据持久化说明

项目已经具备本地数据持久化能力。卡片数据会写入 SQLite 文件，重启后仍然保留。

如果你想备份数据，直接复制 `server/data/cards.db` 即可。

## 后续可扩展方向

- 导出 Markdown 或 JSON 备份
- 更完善的标签体系
- 周报和月报回顾
- 更强的相似卡片推荐
- 语音输入或 AI 辅助总结

## 说明

这个项目当前定位为个人本地应用，重点是轻量记录和快速回顾，而不是复杂协作平台。