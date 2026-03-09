# Mango Finance Frontend

[中文](#中文说明) | [English](#english)

## 中文说明

### 项目简介

Mango Finance Frontend 是一个基于 Vue 3 + Vite 的个人财务管理前端项目，包含登录鉴权、仪表盘、记账、投资、行情、资讯、数据分析与工具箱等页面。

### 测试版

- 测试版已上线：<https://mangofinance.cc/>

### 技术栈

- Vue 3
- Vite
- Pinia
- Vue Router
- Element Plus
- Tailwind CSS v4
- Axios

### 环境要求

- Node.js: `^20.19.0 || >=22.12.0`
- npm（项目使用 `package-lock.json`）

### 本地开发

```bash
npm install
npm run dev
```

默认开发地址：

- `http://127.0.0.1:3000`

开发期 API 代理：

- `/api -> http://127.0.0.1:8000`

### 构建与预览

```bash
npm run build
npm run preview
```

### 可用脚本

- `npm run dev`: 启动开发服务器
- `npm run build`: 生产构建
- `npm run preview`: 本地预览构建产物

当前未内置：

- `lint` 脚本
- `test` 脚本

### 关键约定

- 模块系统：ESM（`"type": "module"`）
- 路径别名：`@` -> `src`
- API 请求统一通过 `src/utils/api.js` 的 Axios 实例

### 主要目录

```text
src/
  config/        # 运行时配置与常量
  pages/         # 页面组件
  router/        # 路由定义与守卫
  stores/        # Pinia 状态管理
  styles/        # 全局样式
  utils/         # 工具方法与 API 封装
```

### 路由页面

- `/login` 登录
- `/dashboard` 仪表盘
- `/bookkeeping` 记账
- `/investment` 投资
- `/market` 行情
- `/news` 资讯
- `/analysis` 数据分析
- `/tools` 工具箱

---

## English

### Overview

Mango Finance Frontend is a Vue 3 + Vite application for personal finance workflows, including authentication, dashboard, bookkeeping, investment, market, news, analytics, and toolbox pages.

### Beta Deployment

- Beta is live at: <https://mangofinance.cc/>

### Tech Stack

- Vue 3
- Vite
- Pinia
- Vue Router
- Element Plus
- Tailwind CSS v4
- Axios

### Requirements

- Node.js: `^20.19.0 || >=22.12.0`
- npm (lockfile: `package-lock.json`)

### Local Development

```bash
npm install
npm run dev
```

Default dev URL:

- `http://127.0.0.1:3000`

Dev API proxy:

- `/api -> http://127.0.0.1:8000`

### Build and Preview

```bash
npm run build
npm run preview
```

### Available Scripts

- `npm run dev`: start development server
- `npm run build`: build for production
- `npm run preview`: preview production build locally

Currently not included:

- `lint` script
- `test` script

### Project Conventions

- Module system: ESM (`"type": "module"`)
- Path alias: `@` -> `src`
- Shared Axios client: `src/utils/api.js`

### Main Structure

```text
src/
  config/        # runtime config and constants
  pages/         # page components
  router/        # routes and navigation guards
  stores/        # Pinia stores
  styles/        # global styles
  utils/         # helpers and API wrappers
```

### Routes

- `/login`
- `/dashboard`
- `/bookkeeping`
- `/investment`
- `/market`
- `/news`
- `/analysis`
- `/tools`
