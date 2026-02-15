# 实时协作任务看板

一个极简的本地运行的实时协作任务看板，用于测试复杂架构的本地实现能力。

## 技术栈说明

### 后端

- **Node.js**: JavaScript 运行时，生态丰富，开发效率高
- **Express**: 轻量级 Web 框架，快速构建 API
- **ws**: WebSocket 库，实现实时通信
- **pg**: PostgreSQL 客户端
- **ioredis**: Redis 客户端

### 前端

- **原生 HTML/CSS/JavaScript**: 无需构建工具，开箱即用，极简高效
- **响应式设计**: 适配手机和电脑

### 数据库

- **PostgreSQL**: 关系型数据库，数据持久化
- **Redis**: 内存数据库，缓存和加速读取

## 环境准备

### 1. 安装 Node.js

- **版本要求**: 16.x 或更高
- **下载地址**: https://nodejs.org/
- **安装后验证**:
  ```bash
  node --version
  npm --version
  ```

### 2. 安装 PostgreSQL

- **版本要求**: 12.x 或更高
- **Windows**:
  - 下载: https://www.postgresql.org/download/windows/
  - 安装时记住设置的密码（默认建议设为 `postgres`）
- **macOS (Homebrew)**:
  ```bash
  brew install postgresql
  brew services start postgresql
  ```
- **Linux (Ubuntu/Debian)**:
  ```bash
  sudo apt-get update
  sudo apt-get install postgresql postgresql-contrib
  sudo systemctl start postgresql
  ```
- **安装后验证**:
  ```bash
  psql --version
  ```

### 3. 安装 Redis

- **版本要求**: 6.x 或更高
- **Windows**:
  - 推荐使用 WSL2 安装，或下载 Memurai (Redis 的 Windows 兼容版)
  - 下载: https://www.memurai.com/get-memurai
- **macOS (Homebrew)**:
  ```bash
  brew install redis
  brew services start redis
  ```
- **Linux (Ubuntu/Debian)**:
  ```bash
  sudo apt-get update
  sudo apt-get install redis-server
  sudo systemctl start redis
  ```
- **安装后验证**:
  ```bash
  redis-cli --version
  ```

## 启动指南

### 1. 克隆/进入项目目录

```bash
cd task-cooperator
```

### 2. 安装依赖

```bash
npm install
```

### 3. 确保 PostgreSQL 和 Redis 正在运行

- **PostgreSQL**: 默认端口 5432
- **Redis**: 默认端口 6379

### 4. 配置环境变量

复制 `.env-example` 为 `.env`，并根据你的环境修改配置：

```bash
cp .env-example .env
```

编辑 `.env` 文件，填入你的 PostgreSQL 和 Redis 的正确配置信息。

### 5. 初始化数据库

```bash
npm run init-db
```

### 6. 启动服务

```bash
npm start
```

### 7. 打开浏览器

访问: http://localhost:3000

## 功能特性

- ✅ 任务的增删改查
- ✅ 实时 WebSocket 同步（多标签/多浏览器实时更新）
- ✅ Redis 缓存加速
- ✅ 响应式设计（适配手机和电脑）
- ✅ 数据持久化（PostgreSQL）
- ✅ 连接状态指示器
- ✅ 实时操作通知

## 项目结构

```
task-cooperator/
├── package.json          # 项目配置和依赖
├── .env                  # 环境变量配置（被 gitignore 忽略）
├── .env-example          # 环境变量配置示例
├── .gitignore            # Git 忽略文件配置
├── README.md             # 项目说明文档
├── server.js             # 后端服务主文件
├── scripts/
│   └── init-db.js        # 数据库初始化脚本
└── public/
    ├── index.html        # 前端页面
    ├── style.css         # 前端样式
    └── app.js            # 前端逻辑
```

## 配置说明

所有配置都通过环境变量文件 `.env` 管理。该文件已被 `.gitignore` 忽略，不会提交到代码仓库。

### 环境变量说明

| 变量名      | 说明                | 默认值     |
| ----------- | ------------------- | ---------- |
| PG_HOST     | PostgreSQL 主机地址 | localhost  |
| PG_PORT     | PostgreSQL 端口     | 5432       |
| PG_DATABASE | PostgreSQL 数据库名 | task_board |
| PG_USER     | PostgreSQL 用户名   | postgres   |
| PG_PASSWORD | PostgreSQL 密码     | postgres   |
| REDIS_HOST  | Redis 主机地址      | localhost  |
| REDIS_PORT  | Redis 端口          | 6379       |
| PORT        | 服务监听端口        | 3000       |

### 配置步骤

1. 复制示例配置文件：

   ```bash
   cp .env-example .env
   ```

2. 编辑 `.env` 文件，填入你的实际配置信息

## 测试验收流程

1. 启动 PostgreSQL 和 Redis 本地服务
2. 运行程序，打开浏览器访问界面
3. 添加 3 个任务，确认显示正常
4. 打开第二个浏览器标签（或不同浏览器），确认能看到这 3 个任务
5. 在标签 A 修改一个任务的状态，标签 B 自动显示变更（测试实时同步）
6. 重启后端程序，刷新页面，确认 3 个任务还在（测试数据持久化）
7. 快速连续添加 10 个任务，确认无错误（测试基础并发处理）
