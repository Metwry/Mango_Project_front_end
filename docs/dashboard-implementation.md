# 仪表盘功能实现说明

## 1. 功能目标

仪表盘页面用于展示账户总览，核心包括：

- 总资产卡片（按配置货币格式化展示）
- 资金占比饼图（按账户折算后占比）
- 账户资产走势（可按时间范围与账户筛选）
- 账户列表（支持账户编辑与新增入口）

该页面不直接发起写操作，主要承担聚合展示职责。

---

## 2. 文件与调用链

## 2.1 页面入口

- `src/pages/Dashboard.vue`

页面组合了四张卡片：

- `WorthCard`
- `FundProportionCard`
- `TrendCard`
- `AccountListCard`

并通过 `useDashboardWorth` 提供估值数据。

## 2.2 数据流调用链

1. `Dashboard.vue` 调用 `useDashboardWorth`
2. `useDashboardWorth` 读取 `accountsStore.accounts`
3. 账户数据变化时触发 `buildAccountsValuation` 折算
4. 结果分发给 `WorthCard`、`FundProportionCard`、`AccountListCard`
5. `TrendCard` 独立请求快照与汇率，绘制走势图

---

## 3. API 请求与参数

仪表盘依赖的请求来源：

1. 账户列表  
- `GET /user/accounts/`  
- 来源：`accountsStore.fetchAccounts()`

2. 汇率  
- `GET /user/markets/fx-rates/`（可由 `VITE_USD_RATES_ENDPOINT` 覆盖）  
- 来源：`ensureUsdPerCurrencyRates()`

3. 账户快照  
- `GET /snapshot/accounts/`  
- 来源：`TrendCard` 中 `getAccountSnapshots(params)`

`TrendCard` 快照请求参数会根据选择范围动态调整：

- `level`
- `start_time`
- `end_time`
- `limit`
- `account_id`（可选）

---

## 4. 页面布局与交互

`Dashboard.vue` 使用响应式网格布局：

- 移动端单列
- `sm` 双列
- `xl` 四列并固定卡片占位

各卡片职责：

1. `WorthCard`
- 只负责展示金额
- 使用文本节点直接渲染格式化后的总资产金额
- 不包含业务写逻辑

2. `FundProportionCard`
- 基于账户 CNY 折算值绘制饼图
- 超过配置上限后将尾部账户聚合为“其他”

3. `TrendCard`
- 支持范围切换（今天/7天/30天/1年/至今）
- 支持账户筛选
- “今天”范围可按配置启动定时刷新

4. `AccountListCard`
- 展示账户排序列表
- 提供“编辑账户”和“添加账户”弹窗入口

---

## 5. Store 与核心函数职责

## 5.1 `useDashboardWorth`（composable）

核心职责：

- 监听 `accountsStore.lastFetchedAt`
- 拉取/复用汇率缓存
- 执行账户估值折算，产出：
  - `valuedAccounts`
  - `totalWorthCny`
  - `worthReady`

关键函数：

- `refreshWorth({ forceRates })`
- `applyValuation(rates)`

## 5.2 `accountsStore`（协作数据源）

关键字段：

- `accounts`
- `fetched`
- `lastFetchedAt`

关键函数：

- `fetchAccounts()`
- `refreshAccounts()`
- 自动刷新启动/停止（由 `Home.vue` 控制）

---

## 6. 错误处理与边界

1. 汇率失败降级
- `useDashboardWorth` 在汇率请求失败时使用缓存汇率，避免整页中断。

2. 趋势图容错
- `TrendCard` 对快照结构做防御解析；
- 请求失败仅影响该卡片，显示“走势数据加载失败”。

3. 全局错误提示
- API 层统一拦截并做节流/去重，避免恢复前台时错误提示刷屏。

---

## 7. 本轮保守清理记录

- 删除未引用卡片组件：
  - `src/components/cards/dashboardCards/ActivityCard.vue`
  - `src/components/cards/dashboardCards/BudgetCard.vue`
- 收敛无效暴露：
  - `Dashboard.vue` 去除未使用的 `monthlyChange` 传递
  - `WorthCard.vue` 去除未使用的 `change` 入参
  - `useDashboardWorth` 去除未消费的导出字段（`totalWorthUsd`、`refreshWorth`）
