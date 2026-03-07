# 前端技术学习文档（结合当前项目版本）

本文档面向想通过本项目学习 Vue 3 前端工程化的开发者。内容以当前代码版本为准，重点不是讲抽象概念，而是讲“这些知识点在项目里是怎么真的被用起来的”。

## 1. 推荐阅读路径

建议按这个顺序读源码：

1. `src/main.js`
2. `src/router/index.js`
3. `src/pages/Home.vue`
4. 任一业务页面（Dashboard / Bookkeeping / Market / Investment）
5. 对应 composable
6. 对应 store
7. `src/utils/api.js`
8. `src/config/Config.js`
9. `src/styles/style.css`

这样能形成：页面 -> 状态 -> 请求 -> 配置 -> 样式 的完整心智模型。

## 2. JavaScript 知识点（项目实战版）

### 2.1 ESM 模块化

项目全量使用 ESM：

- `import { useMarketStore } from "@/stores/market"`
- `export const AUTO_REFRESH_ENABLED = ...`

重点：

- 配置和工具函数多用命名导出
- 共享实例多用默认导出

典型文件：

- `src/config/Config.js`
- `src/utils/api.js`

### 2.2 防御式取值

项目里大量使用：

- `obj?.a?.b`
- `value ?? fallback`
- `String(value ?? "").trim()`
- `Number.isFinite(n)`

这类写法主要用于处理后端字段不稳定、可空、类型漂移的问题。

典型文件：

- `src/stores/investment.js`
- `src/components/cards/investmentCards/PositionCard.vue`
- `src/utils/api.js`

### 2.3 Map / Set

#### Set 去重

投资报价刷新前会按 `market + short_code` 去重，避免同一个标的被重复请求。

#### Map 建索引

行情页搜索缓存、走势映射、市场顺序映射都使用 `Map` 提升查找效率。

典型文件：

- `src/stores/investment.js`
- `src/composables/useMarketPage.js`

### 2.4 Promise 并发与并发保护

项目里高频用法：

- `Promise.all` / `Promise.allSettled`
- Promise 缓存（防止重复请求）
- `requestSeq`（防旧请求覆盖新结果）

典型文件：

- `src/stores/accounts.js`
- `src/stores/market.js`
- `src/stores/investment.js`
- `src/composables/useMarketPage.js`

### 2.5 参数清洗与归一化

这是项目里非常高频的一类工作：

- 清洗 query 参数
- 归一化后端字段命名
- 格式化金额、日期、数量
- 统一 payload 结构

典型文件：

- `src/stores/transaction.js`
- `src/stores/investment.js`
- `src/utils/formatters.js`

## 3. Vue 3 知识点

### 3.1 `ref / computed / watch`

项目中的真实用法：

- `ref`：loading、弹窗开关、DOM ref、搜索关键字
- `computed`：派生标题、筛选标签、格式化金额、图表 option
- `watch`：路由切换方向、搜索行为、主题状态、文本溢出重算

典型文件：

- `src/pages/Home.vue`
- `src/composables/useMarketPage.js`
- `src/components/cards/investmentCards/PositionCard.vue`

### 3.2 生命周期

常见模式：

- `onMounted` 初始化数据
- `onUnmounted` 清理监听器与自动刷新调度器

典型文件：

- `src/pages/Home.vue`
- `src/components/cards/dashboardCards/TrendCard.vue`
- `src/components/cards/investmentCards/PositionCard.vue`

### 3.3 `<script setup>`

项目当前组件基本都采用 `<script setup>`。

优点：

- 代码短
- 依赖关系直接
- 模板直接访问脚本变量

### 3.4 内置能力：Transition / Teleport / RouterView

- `Home.vue` 用 `RouterView v-slot` + `Transition` 实现页面切换动画
- `AddTransaction.vue` 等弹窗使用 `Teleport to="body"`
- 下拉菜单、弹层和交易面板都依赖过渡动画

## 4. 项目里的第三方包

### 4.1 Pinia

项目采用 setup store 写法，特点是：

- 业务逻辑集中在 store
- 页面尽量只消费状态和触发 action
- 登出时统一 `reset()`

### 4.2 Vue Router

当前项目路由特点：

- 子路由挂在 `Home.vue` 下形成统一布局
- 业务页懒加载
- 全局前置守卫控制未登录跳转

### 4.3 Axios

项目请求统一通过 `src/utils/api.js`：

- request 拦截器负责 token 注入
- response 拦截器负责 401 刷新 token
- 错误消息做节流和去重

### 4.4 Element Plus

当前高频使用：

- `ElMessage`
- `ElMessageBox.confirm`

而不是大面积使用整套表单组件。项目更多是拿它做交互反馈层。

### 4.5 @vueuse/core

当前用得最频繁的函数：

- `useDebounceFn`
- `useEventListener`
- `onClickOutside`
- `useResizeObserver`

### 4.6 ECharts + vue-echarts

项目图表包括：

- 仪表盘资金占比饼图
- 仪表盘账户走势折线图
- 投资持仓卡的微型走势折线图

一个很实战的点：

- 图表文字并不是 DOM 文本，而是 canvas 绘制文本
- 因此字体、字号、颜色、主题切换都要在 option 里控制
- 例如投资卡 X 轴时间字已经改成按主题切换黑/白

### 4.7 dayjs

用于：

- 交易录入默认时间
- 时间字符串格式化

## 5. Tailwind CSS 与项目样式体系

### 5.1 工具类 + 语义类混合模式

项目不是纯 Tailwind 原子类，也不是纯手写 CSS，而是混合模式：

- 模板里用原子类快速布局
- `src/styles/style.css` 里沉淀高频语义类

这是当前项目最重要的样式组织方式。

### 5.2 当前高频语义类

- `card-base`
- `button-base`
- `input-base`
- `dropdown-trigger / dropdown-panel / dropdown-item`
- `nav-item / nav-item-active`
- `th-text / td-cell`
- `status-base`
- `surface-chip`

注意：

- 之前项目里自定义过 `.text-base`，会和 Tailwind 的字号类冲突
- 当前版本已经改成 `.status-base`
- 这是一个非常典型的“语义类命名不要占用 Tailwind 官方类名”的教训

### 5.3 深色模式

当前黑夜模式的做法已经升级成 token 驱动：

- `--app-bg`
- `--surface-*`
- `--text-*`
- `--border-*`

然后再配合：

- `.dark .card-base`
- `.dark .button-base`
- `.dark .dropdown-*`
- `.dark .modal-content`

项目里还存在一个白名单类：`preserve-dark-white`

用途：

- 当某些业务按钮必须保留真白文字时，不让全局暗色正文色覆盖它

### 5.4 响应式与移动端适配

当前项目已经做过一些很具体的移动端修正：

- `Home.vue` 使用 `100dvh`
- 顶部栏处理 `safe-area-inset-top`
- 页面滚动区处理 `safe-area-inset-bottom`
- 手机端顶部标题变成页面下拉导航
- 投资页提交区做了防遮挡处理

## 6. 当前配置体系

统一入口：`src/config/Config.js`

当前配置分区：

- App / API / 认证
- 投资端点
- 自动刷新总控
- store 定时刷新配置
- 汇率配置
- Dashboard 配置
- Investment 走势图配置
- 搜索配置

使用原则：

- 业务代码优先读 `Config.js`
- 不在组件里直接散写 `import.meta.env`

## 7. 读源码时的高价值关注点

1. 先看 store，理解状态和 action
2. 再看页面怎么消费 store
3. 再看 utils / API 层如何归一化数据
4. 最后看样式基类和主题 token

尤其注意这些模式：

- Promise 缓存
- requestSeq 防并发覆盖
- MutationObserver 监听主题切换
- visibilitychange 刷新
- safe-area 适配

## 8. 当前文档配套关系

- `docs/frontend-overview.md`：建立全局心智模型
- `docs/dashboard-implementation.md`：理解仪表盘
- `docs/bookkeeping-implementation.md`：理解记账链路
- `docs/market-implementation.md`：理解行情搜索/筛选/缓存
- `docs/investment-implementation.md`：理解持仓、交易、图表

建议读法：

1. 先看 `frontend-overview.md`
2. 再挑一个模块顺着 页面 -> composable -> store -> utils 去读
3. 最后回到本 `learn.md` 对照知识点复盘
