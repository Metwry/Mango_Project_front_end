# 仪表盘功能实现说明

## 1. 功能目标

仪表盘用于集中展示账户总览信息，当前包含四块核心内容：

- 总资产卡片
- 资金占比饼图
- 账户资产走势
- 账户列表

该页面本身不承担写操作，主要做聚合展示、估值换算与趋势可视化。

## 2. 文件与调用链

### 2.1 页面入口

- 页面：`src/pages/Dashboard.vue`
- 组合函数：`src/composables/useDashboardWorth.js`

### 2.2 页面组件

- `WorthCard`
- `FundProportionCard`
- `TrendCard`
- `AccountListCard`

### 2.3 数据链路

1. `Dashboard.vue` 调用 `useDashboardWorth()`
2. `useDashboardWorth()` 从 `accountsStore` 读取账户数据
3. 组合函数负责汇率换算与估值聚合
4. `TrendCard` 独立拉取账户快照并绘制走势图
5. `AccountListCard` 提供账户修改与新增入口

## 3. API 请求与参数

### 3.1 账户列表

- `GET /user/accounts/`
- 来源：`accountsStore.fetchAccounts()`

### 3.2 汇率

- `GET /user/markets/fx-rates/`
- 来源：`ensureUsdPerCurrencyRates()`
- 可由 `Config.js` 中 `FX_RATES_CONFIG.usdRatesEndpoint` 覆盖

### 3.3 账户走势快照

- `GET /snapshot/accounts/`
- 来源：`TrendCard` 中的 `getAccountSnapshots(params)`

`TrendCard` 会根据范围动态构造：

- `level`
- `start_time`
- `end_time`
- `limit`
- `account_id`（可选）

## 4. 页面布局与交互

`Dashboard.vue` 当前使用 4 卡响应式网格：

- 移动端：单列
- `sm`：双列
- `xl`：四列双行布局

布局结构：

- 第一行：`WorthCard`（3 列） + `FundProportionCard`（1 列）
- 第二行：`TrendCard`（3 列） + `AccountListCard`（1 列）

### 4.1 WorthCard

- 展示总资产金额
- 使用数字滚动组件增强变化感
- 金额格式由 `DASHBOARD_WORTH_CONFIG` 决定

### 4.2 FundProportionCard

- 根据账户折算值绘制资金占比饼图
- 当账户数量超出展示上限时，尾部聚合为“其他”

### 4.3 TrendCard

- 支持范围切换：今天 / 近 7 天 / 近 30 天 / 近 1 年 / 至今为止
- 支持按账户筛选
- 今日范围支持自动刷新
- 使用 ECharts 绘制折线图

### 4.4 AccountListCard

- 展示账户余额列表
- 支持打开修改账户弹窗
- 支持打开新增账户弹窗

## 5. Store 与 composable 职责

### 5.1 `useDashboardWorth`

职责：

- 监听账户数据
- 拉取或复用汇率缓存
- 把不同币种账户折算成统一估值
- 输出页面可直接消费的数据

核心产物：

- `accounts`
- `valuedAccounts`
- `totalWorthCny`
- `worthReady`

### 5.2 `accountsStore`

职责：

- 提供账户原始数据
- 负责账户自动刷新
- 为仪表盘、记账、投资模块提供统一账户源

### 5.3 `TrendCard`

`TrendCard` 自己承担一部分“卡片内数据层”职责：

- 读取范围配置
- 请求快照
- 处理时间轴与汇率折算
- 在今日范围下启动分钟对齐调度器

## 6. 错误处理与边界

1. 汇率失败
- 优先使用缓存汇率，避免整个仪表盘失效

2. 走势失败
- 仅影响 `TrendCard`
- 卡片内部显示错误或空态，不影响其它卡片

3. 账户为空
- 总资产、占比、账户列表会自然退化为空状态

4. 全局请求错误
- 统一由 `api.js` 做 token 刷新、节流与提示

## 7. 当前版本特点

- Dashboard 在手机和桌面使用不同的高度策略，避免账户列表被截断
- 仪表盘没有套用固定高度的激进方案，优先保证内容完整展示
- 主题风格已跟随全局 token 体系，黑夜模式下整体使用中性黑表面

## 8. 阅读源码建议

1. `src/pages/Dashboard.vue`
2. `src/composables/useDashboardWorth.js`
3. `src/components/cards/dashboardCards/TrendCard.vue`
4. `src/components/cards/dashboardCards/WorthCard.vue`
5. `src/components/cards/dashboardCards/FundProportionCard.vue`
6. `src/components/cards/dashboardCards/AccountListCard.vue`
