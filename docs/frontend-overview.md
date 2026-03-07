# 前端项目全局概览

## 1. 技术栈与启动结构

- 框架：Vue 3 + Vite
- 状态管理：Pinia
- 路由：Vue Router
- 组件库：Element Plus
- 样式：Tailwind CSS + 项目级通用样式类（`src/styles/style.css`）

应用启动链路：

1. `src/main.js` 创建应用
2. 注入 Pinia、Router、Element Plus
3. 挂载到 `#app`
4. `src/App.vue` 仅渲染顶层 `RouterView`

---

## 2. 主要 UI 风格体系

## 2.1 全局视觉风格

- 浅/深色双主题（大量 `dark:*` 类）
- 以卡片式布局为核心（`card-base`）
- 通用圆角、轻阴影、边框分层
- 页面内常用动画：路由切换、下拉弹层、局部图表更新

## 2.2 通用样式基元（`src/styles/style.css`）

高频复用 class：

- `card-base`：卡片容器
- `button-base`：按钮基类
- `input-base`：输入控件基类
- `dropdown-*`：下拉触发器与面板
- `nav-item/nav-item-active`：侧边导航
- `th-text/td-cell`：表格单元

这套基元保证了各模块 UI 风格一致。

---

## 3. 路由与转发路径

路由定义在 `src/router/index.js`：

- `/login`：登录页
- `/`：受保护布局页，重定向到 `/dashboard`
  - `/dashboard`
  - `/bookkeeping`
  - `/market`
  - `/investment`
  - `/analysis`
  - `/tools`

路由守卫规则：

1. 访问受保护路由且未登录 -> 跳转 `/login`
2. 已登录访问 `/login` -> 跳转 `/dashboard`

布局页 `src/pages/Home.vue` 提供：

- 侧边栏（`Sidebar`）
- 顶栏（`TopBar`）
- 页面过渡动画（上/下滑切换）

---

## 4. Store 结构与职责划分

Pinia store 位于 `src/stores/`：

1. `auth.js`
- 登录态、token、用户信息持久化
- 登录后初始化业务 store
- 登出后重置业务 store

2. `accounts.js`
- 账户列表与账户增删改
- 账户详情缓存
- 支持分钟对齐自动刷新

3. `transaction.js`
- 记账列表查询、新增、撤销、删除
- 模式筛选（活动/交易/已撤销）

4. `market.js`
- 自选行情拉取与市场筛选
- 自选标的增删
- 选中市场本地持久化

5. `investment.js`
- 持仓拉取与归一化
- 最新报价刷新
- 买卖交易与账户联动刷新

---

## 5. 组件调用关系（核心链路）

## 5.1 顶层布局链路

`main.js -> App.vue -> router -> Home.vue -> RouterView(业务页面)`

## 5.2 页面到组件关系

1. Dashboard  
- `Dashboard.vue`
  - `WorthCard`
  - `FundProportionCard`
  - `TrendCard`
  - `AccountListCard`
- 数据由 `useDashboardWorth + accountsStore` 驱动

2. Bookkeeping  
- `Bookkeeping.vue`
  - `TransactionsHistoryCard`
  - `AddTransaction`（弹窗）
- 数据由 `useBookkeepingPage + transactionsStore + accountsStore` 驱动

3. Market  
- `Market.vue`
  - 页面内表格+下拉+搜索 UI
- 交互由 `useMarketPage + marketStore` 驱动

4. Investment  
- `Investment.vue`
  - `PositionCard`（多实例）
  - `AddPositionCard`
- `PositionCard` 内部组合 `TradePositionPanel`
- 数据由 `investmentStore + accountsStore` 驱动

---

## 6. 配置入口与环境变量

统一配置文件：

- `src/config/Config.js`

配置来源：

- `import.meta.env`（`.env.development` 等）

配置内容包括：

- App 版本
- API 基础地址/超时
- 错误提示节流参数
- 认证与投资端点
- 自动刷新开关与各模块刷新频率
- 汇率与搜索相关参数

---

## 7. 全局请求与错误处理机制

统一请求实例：`src/utils/api.js`

关键机制：

1. Request 拦截
- 自动注入 `Authorization`（非免鉴权路径）
- 免鉴权路径清除 token 头

2. Response 拦截
- 401 自动刷新 token
- 刷新失败触发登出并跳转登录
- 请求失败统一错误提示

3. 错误提示防刷屏
- 页面隐藏时抑制提示
- 同类错误去重 + 最小时间间隔节流

---

## 8. 自动刷新总控策略

总开关：`AUTO_REFRESH_ENABLED`（由 `VITE_REFRESH_MODE` 驱动）

- `auto`：启用自动刷新
- `manual`：仅用户触发刷新

自动刷新覆盖范围：

- `accountsStore` 账户刷新
- `marketStore` 行情刷新
- `investmentStore` 报价刷新
- Dashboard/Investment 卡片内图表刷新
- Market 页回前台 `visibilitychange` 刷新

---

## 9. 当前文档索引

模块实现文档：

- `docs/bookkeeping-implementation.md`
- `docs/dashboard-implementation.md`
- `docs/market-implementation.md`
- `docs/investment-implementation.md`

全局文档：

- `docs/frontend-overview.md`
