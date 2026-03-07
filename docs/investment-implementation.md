# 投资功能实现说明

## 1. 功能目标

投资页面用于管理持仓与交易，核心能力：

- 拉取持仓列表并做字段归一化
- 实时刷新持仓最新价并更新浮盈
- 新增持仓（买入）
- 持仓卡片内买入/卖出
- 展示单标的短周期走势
- 交易后联动刷新账户余额

---

## 2. 文件与调用链

## 2.1 页面与组件

- 页面：`src/pages/Investment.vue`
- 卡片：
  - `src/components/cards/investmentCards/PositionCard.vue`
  - `src/components/cards/investmentCards/AddPositionCard.vue`
- 交易面板：
  - `src/components/windows/TradePositionPanel.vue`

## 2.2 数据层

- Store：`src/stores/investment.js`
- 协作 Store：`src/stores/accounts.js`
- API：`src/utils/investment.js`
- 快照：`src/utils/snapshot.js`

调用链概览：

1. `Investment.vue` 首次挂载拉取 `fetchPositions + fetchAccounts`
2. `investmentStore` 负责持仓数据、报价刷新、交易提交
3. `PositionCard/AddPositionCard/TradePositionPanel` 触发买卖动作
4. 交易完成后并发刷新持仓与账户余额

---

## 3. API 请求与参数

主要端点：

1. 持仓列表  
- `GET /investment/positions/`

2. 最新报价  
- `POST /user/markets/quotes/latest/`  
- body：`{ items: [{ market, short_code }] }`

3. 买入  
- `POST /investment/buy/`（可由配置覆盖）

4. 卖出  
- `POST /investment/sell/`（可由配置覆盖）

5. 持仓快照  
- `GET /snapshot/positions/`

交易 payload 统一规范化为：

- `instrument_id`
- `quantity`（正数、标准小数字符串）
- `price`（正数、标准小数字符串）
- `cash_account_id`

---

## 4. 页面布局与交互

`Investment.vue` 为卡片网格：

- 每个持仓对应一个 `PositionCard`
- 末尾附加一个 `AddPositionCard` 作为新增入口

`PositionCard` 交互：

- 展示当前价/成本价/数量/盈亏
- 内置走势图（快照）
- 买入、卖出按钮触发 `TradePositionPanel`

`AddPositionCard` 交互：

- 搜索标的（防抖+下拉）
- 填写价格、数量、扣款账户
- 直接提交买入

---

## 5. Store 与核心函数职责

`src/stores/investment.js` 负责投资域核心状态。

核心状态：

- `positions`
- `loading/error`
- `trading/tradeError`
- 内部并发控制：`fetchPromise`、`quotePromise`

核心函数：

- `fetchPositions({ force, silent })`
- `refreshLatestQuotes({ silent })`
- `refreshPositions()`
- `buyPosition(payload)`
- `sellPosition(payload)`

关键实现点：

1. 持仓归一化
- 接口字段统一映射成前端结构（`instrumentId/symbol/name/currentPrice/...`）

2. 报价去重
- 先按 `market + short_code` 去重，再批量请求报价

3. 交易后联动
- `submitTrade` 成功后并发：
  - `refreshPositions()`
  - `accountsStore.fetchAccounts({ force: true })`

4. 自动刷新
- 通过分钟对齐调度器刷新报价，受全局 `AUTO_REFRESH_ENABLED` 控制

---

## 6. 错误处理与边界

1. 交易参数校验
- 参数不完整时直接抛错并中断提交。

2. 报价刷新失败
- `silent` 场景不强制清空现有持仓展示。

3. 快照失败
- 卡片显示“走势加载失败”，不影响主持仓与交易功能。

4. 全局请求错误
- 由 `api.js` 统一处理 401 刷新与错误提示节流。

---

## 7. 本轮保守清理记录

- 保持页面结构和交易流程不变；
- 精简 store 对外暴露字段，只保留实际页面消费项；
- 删除 `PositionCard` 中未使用的格式化函数，降低噪声；
- 未改动接口路径、交易 payload 语义与交互时序。
