# 前端项目全局概览

## 1. 项目定位与技术栈

这是一个以资产管理为核心的前端项目，当前已落地的主功能包括：

- 仪表盘：账户总资产、占比、走势、账户列表
- 记账：手工流水查询、录入、撤销、删除
- 行情：自选行情展示、搜索添加、市场筛选、删除
- 投资：持仓展示、买入/卖出、短周期走势、账户联动
- 数据分析 / 工具箱：当前为占位页

技术栈：

- Vue 3
- Vite
- Pinia
- Vue Router
- Element Plus
- Tailwind CSS
- vue-echarts / ECharts
- @vueuse/core

应用入口链路：

1. `src/main.js` 创建应用并注入 Pinia / Router / Element Plus
2. `src/App.vue` 只渲染顶层 `RouterView`
3. `src/router/index.js` 控制登录页与受保护布局页
4. `src/pages/Home.vue` 提供统一壳层布局
5. 业务页面通过 `RouterView` 懒加载切换

## 2. 当前 UI 风格体系

### 2.1 总体风格

项目当前已经形成两套稳定主题：

- 浅色模式：浅背景、白卡片、轻边框
- 黑夜模式：中性黑背景、深色表面、柔和灰白正文

视觉基调不是高饱和炫彩风，而是偏金融管理后台风格：

- 主背景接近纯黑
- 组件背景为深灰黑表面
- 文本以 `--text-primary / --text-secondary / --text-muted` 分层
- 选中态改为浅灰深底，不再大面积使用亮品牌色底
- 保留业务语义色：删除红、涨跌红绿、账户代表色、买入/卖出动作色

### 2.2 样式语义层

通用样式入口：`src/styles/style.css`

当前高频复用基类：

- `card-base`：卡片容器
- `button-base`：按钮基类
- `input-base`：输入控件基类
- `dropdown-*`：下拉触发器、面板、项
- `nav-item / nav-item-active`：侧边导航项
- `th-text / td-cell`：表格语义类
- `status-base`：列表空态/加载态对齐文本
- `surface-chip`：轻量信息胶囊

暗色模式不再只靠零散 `dark:*` 类，而是通过 token 统一驱动：

- `--app-bg`
- `--surface-1/2/3`
- `--surface-hover`
- `--surface-selected`
- `--text-primary/secondary/muted`
- `--border-subtle/strong`

### 2.3 布局壳层

`src/pages/Home.vue` 负责：

- 左侧 `Sidebar`
- 顶部 `Topbar`
- 页面容器高度控制
- 页面切换方向动画
- 自动刷新调度器启动/停止

当前壳层特征：

- 使用 `100dvh` 适配移动端动态视口
- `page-scroll` 负责主滚动区与底部安全区留白
- Dashboard 与其他页在高度策略上分开处理
- 页面切换使用上下滑过渡；移动端降级为淡入淡出

## 3. 路由与跳转规则

路由定义文件：`src/router/index.js`

当前路由：

- `/login`：登录页
- `/`：受保护布局，默认重定向到 `/dashboard`
- `/dashboard`：仪表盘
- `/bookkeeping`：记账
- `/investment`：投资
- `/market`：行情
- `/analysis`：数据分析占位页
- `/tools`：工具箱占位页

路由守卫规则：

1. 访问任意 `meta.requireAuth` 路由且未登录时，重定向到 `/login`
2. 已登录访问 `/login` 时，重定向到 `/dashboard`

### 3.1 顶部与侧边导航

- 桌面端：左侧 `Sidebar` + 顶部标题区
- 手机端：侧边栏隐藏，`Topbar` 顶部标题区域变成下拉导航菜单
- `Topbar` 使用当前路由的 `meta.title / meta.icon` 展示当前页信息
- 移动端菜单项来自 `Home.vue` 的 `menuItems`

### 3.2 当前页面顺序

`Home.vue` 内定义的导航顺序为：

1. 仪表盘
2. 记账
3. 行情
4. 投资
5. 数据分析
6. 工具箱

这个顺序同时影响：

- 侧边栏显示顺序
- 手机端顶部下拉菜单顺序
- 页面切换动画方向判断

## 4. Store 结构与职责

Pinia store 位于 `src/stores/`。

### 4.1 `auth.js`

职责：

- 登录态、token、用户信息管理
- 登录后初始化业务 store
- 401 刷新 token 失败时配合 `api.js` 做退出
- 登出时重置业务域状态

### 4.2 `accounts.js`

职责：

- 账户列表查询
- 账户新增 / 更新 / 删除
- 账户自动刷新
- 为仪表盘和记账/投资模块提供账户源数据

### 4.3 `transaction.js`

职责：

- 交易列表分页查询
- 模式切换（活动记录 / 投资记录 / 已撤销记录）
- 新增、撤销、删除
- 维护查询参数、页码、总数、错误状态

### 4.4 `market.js`

职责：

- 自选行情列表拉取
- 自选删除
- 自选市场筛选持久化
- 自动刷新
- 为行情页提供更新时间、市场分块数据

### 4.5 `investment.js`

职责：

- 持仓列表拉取与字段归一化
- 最新报价刷新
- 买入 / 卖出交易提交
- 交易后联动刷新账户余额
- 投资域自动刷新

## 5. 页面与组件调用关系

### 5.1 Dashboard

`src/pages/Dashboard.vue`

- `WorthCard`
- `FundProportionCard`
- `TrendCard`
- `AccountListCard`

数据链路：

- `useDashboardWorth`
- `accountsStore`
- `snapshot + fxRates` 工具函数

### 5.2 Bookkeeping

`src/pages/Bookkeeping.vue`

- `TransactionsHistoryCard`
- `AddTransaction` 弹窗

行为编排：

- `useBookkeepingPage`
- `transactionsStore`
- `accountsStore`

### 5.3 Market

`src/pages/Market.vue`

- 页面自身负责筛选条、搜索框、表格
- 使用 `useMarketPage` 统一交互逻辑

数据源：

- `marketStore`
- `utils/markets.js`

### 5.4 Investment

`src/pages/Investment.vue`

- 多个 `PositionCard`
- 一个 `AddPositionCard`
- `PositionCard` 内部组合 `TradePositionPanel`

数据源：

- `investmentStore`
- `accountsStore`

### 5.5 占位页面

- `src/pages/Analysis.vue`
- `src/pages/Tools.vue`

当前都是开发中占位卡片，已接入主布局和主题体系，但没有业务 store 和 API。

## 6. 配置入口与环境变量

统一配置入口：`src/config/Config.js`

当前配置内容包括：

- App 版本：`APP_VERSION / APP_VERSION_LABEL`
- API：`API_BASE_URL / API_TIMEOUT_MS`
- 错误提示节流：`API_ERROR_TOAST_MIN_INTERVAL_MS`、`API_ERROR_TOAST_DUPLICATE_SUPPRESS_MS`
- 认证端点：`AUTH_ENDPOINTS`
- 投资交易端点：`INVESTMENT_ENDPOINTS`
- 自动刷新总开关：`AUTO_REFRESH_ENABLED`
- 各 store 定时刷新配置：`STORE_REFRESH_CONFIG`
- 汇率配置：`FX_RATES_CONFIG`
- 仪表盘配置：`DASHBOARD_WORTH_CONFIG`、`FUND_PROPORTION_CONFIG`、`DASHBOARD_TREND_CONFIG`
- 投资走势配置：`POSITION_TREND_CONFIG`
- 搜索配置：`SEARCH_CONFIG`

当前自动刷新总控规则：

- `VITE_REFRESH_MODE=auto`：启用自动刷新
- `VITE_REFRESH_MODE=manual`：禁用页面/卡片内自动刷新，仅保留用户操作触发

## 7. 全局请求与错误处理

请求层入口：`src/utils/api.js`

核心机制：

1. request 拦截器
- 给非免鉴权接口注入 `Authorization`
- 处理基础 URL、超时等统一设置

2. response 拦截器
- 401 时尝试刷新 token
- 刷新失败时退出登录并跳转 `/login`

3. 错误提示防刷屏
- 页面隐藏时抑制提示
- 同类错误做时间窗口去重
- 避免移动端切回前台后连续弹一串错误

## 8. 自动刷新与页面可见性策略

自动刷新现在由 `Home.vue + store + 卡片级调度器` 共同组成。

### 8.1 布局层

`Home.vue` 在启用自动刷新时统一启动：

- `accountsStore.startAccountsAutoRefresh()`
- `investmentStore.startInvestmentAutoRefresh()`
- `marketStore.startMarketAutoRefresh()`

页面卸载时统一停止。

### 8.2 页面 / 卡片层

- `TrendCard`：今日范围下按分钟对齐刷新
- `PositionCard`：单持仓走势按分钟对齐刷新
- `useMarketPage`：页面重新回到前台时用 `visibilitychange` 触发静默刷新

## 9. 当前版本下需要知道的几个实现特征

1. 手机端导航不是侧边栏抽屉，而是顶部标题下拉菜单
2. 页面高度策略已经针对手机地址栏和底部安全区做过适配
3. 黑夜模式已经有统一 token，但仍保留少量业务色白名单
4. 投资持仓卡片在暗色下使用黑色卡面 + 品牌色边框，不再用浅色大底
5. Analysis / Tools 已接入布局，但当前仍是占位页

## 10. 文档索引

- `docs/bookkeeping-implementation.md`
- `docs/dashboard-implementation.md`
- `docs/market-implementation.md`
- `docs/investment-implementation.md`
- `docs/learn.md`
