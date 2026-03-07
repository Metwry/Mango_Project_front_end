# 投资功能实现说明

## 1. 功能目标

投资页面用于管理持仓与买卖交易，当前已实现：

- 拉取并展示持仓列表
- 拉取账户列表并识别投资账户
- 自动刷新持仓最新报价
- 单持仓卡片内买入 / 卖出
- 新增持仓（搜索标的后直接买入）
- 展示单标的 24 小时内 15 分钟粒度走势
- 交易成功后联动刷新账户余额和持仓列表

## 2. 文件与调用链

### 2.1 页面与组件

- 页面：`src/pages/Investment.vue`
- 持仓卡：`src/components/cards/investmentCards/PositionCard.vue`
- 新增卡：`src/components/cards/investmentCards/AddPositionCard.vue`
- 交易面板：`src/components/windows/TradePositionPanel.vue`

### 2.2 数据层

- 主 store：`src/stores/investment.js`
- 协作 store：`src/stores/accounts.js`
- API：`src/utils/investment.js`
- 快照：`src/utils/snapshot.js`
- 刷新调度器：`src/utils/refreshScheduler.js`

调用链概览：

1. `Investment.vue` 挂载时并发执行 `investmentStore.fetchPositions()` 与 `accountsStore.fetchAccounts()`
2. 页面把 `positions` 渲染成多个 `PositionCard`
3. `PositionCard` 内部可打开 `TradePositionPanel` 完成买入/卖出
4. 页面末尾附加 `AddPositionCard`，用于搜索新标的并直接买入
5. 交易提交成功后由 `investmentStore` 并发刷新持仓与账户数据

## 3. API 请求与参数

### 3.1 持仓与交易相关

1. 持仓列表
- `GET /investment/positions/`

2. 最新报价
- `POST /user/markets/quotes/latest/`
- body 结构：`{ items: [{ market, short_code }] }`

3. 买入
- `POST /investment/buy/`
- 可由 `Config.js` 中 `INVESTMENT_ENDPOINTS.buy` 覆盖

4. 卖出
- `POST /investment/sell/`
- 可由 `Config.js` 中 `INVESTMENT_ENDPOINTS.sell` 覆盖

### 3.2 走势快照

1. 持仓走势图
- `GET /snapshot/positions/`
- 参数来自 `POSITION_TREND_CONFIG`
- 当前默认：
  - `level = M15`
  - `lookbackHours = 24`
  - `snapshotLimit = 10000`

### 3.3 交易 payload 约定

买卖交易最终统一为：

- `instrument_id`
- `quantity`
- `price`
- `cash_account_id`

`TradePositionPanel` 会根据模式决定是买入还是卖出，并把当前持仓和账户信息一起整理后交给 store。

## 4. 页面布局与交互

### 4.1 页面布局

`Investment.vue` 使用响应式网格：

- 移动端单列
- `sm` 双列
- `xl` 三列
- `2xl` 四列

每一张卡片的最小高度统一为 `24rem` 左右，保证卡面节奏稳定。

### 4.2 PositionCard

单张持仓卡片展示：

- Logo / 公司名 / 代码
- 盈亏百分比徽章
- 市场价 / 成本价 / 持仓数量
- 今日走势（15m 更新）
- 买入 / 卖出 / 详情按钮

当前实现细节：

- 公司名超长时会启用跑马灯动画
- 走势图使用 `ECharts + vue-echarts`
- 图表 X 轴文字会跟随主题切换：浅色黑字、暗色白字
- 卡片暗色模式已改为黑色卡面，品牌色只保留在边框与弱着色
- 买入 / 卖出按钮在黑夜模式下使用实色深绿 / 深红底，不再是半透明色

### 4.3 TradePositionPanel

交易面板由 `PositionCard` 内部唤起，支持：

- 买入和卖出两种模式切换
- 输入价格、数量
- 选择现金账户
- 快速填充 `Max`
- 高级模式开关（当前仍保留“开发中”提示）

多个 `PositionCard` 之间通过自定义事件 `investment:trade-panel-open` 协调，确保同一时间只打开一张交易面板。

### 4.4 AddPositionCard

新增卡片用于直接买入新的标的：

- 输入股票代码或名称
- 防抖搜索
- 下拉选择候选标的
- 录入价格、数量、扣款账户
- 直接提交买入

当前实现特点：

- 搜索结果下拉做了防抖与隐藏延迟控制
- 中文输入法通过 `compositionstart/end` 处理
- 移动端提交栏采用粘底式留白处理，避免被浏览器底栏遮挡

## 5. Store 与核心函数职责

主 store：`src/stores/investment.js`

### 5.1 核心状态

- `positions`
- `loading`
- `error`
- `trading`
- `tradeError`
- `updatedAt`
- 内部并发控制 promise

### 5.2 核心函数

- `fetchPositions({ force, silent })`
- `refreshLatestQuotes({ silent })`
- `refreshPositions()`
- `buyPosition(payload)`
- `sellPosition(payload)`
- `startInvestmentAutoRefresh()`
- `stopInvestmentAutoRefresh()`
- `reset()`

### 5.3 当前关键实现点

1. 持仓字段归一化
- store 会把后端字段映射成页面更稳定的结构，如：
  - `instrumentId`
  - `symbol`
  - `name`
  - `marketType`
  - `currentPrice`
  - `costPrice`
  - `quantity`

2. 报价去重
- 按 `market + short_code` 去重后批量请求报价
- 避免重复持仓导致重复请求

3. 交易后联动刷新
- 交易成功后并发：
  - `refreshPositions()`
  - `accountsStore.fetchAccounts({ force: true })`

4. 自动刷新
- `investmentStore` 负责最新报价自动刷新
- `PositionCard` 自己负责走势图自动刷新
- 两者都受 `AUTO_REFRESH_ENABLED` 控制

## 6. 主题与样式实现

### 6.1 通用主题来源

投资页通用样式仍依赖：

- `card-base`
- `button-base`
- `input-base`
- `dropdown-*`

这些基类来自 `src/styles/style.css` 的 token 体系。

### 6.2 持仓卡暗色方案

当前暗色投资卡不是普通灰卡，而是：

- 主卡：黑色表面
- 外边框：加粗并使用品牌色高透明描边
- 统计块：深色子卡
- 趋势块：更深一级黑底
- 买卖按钮：实色深绿 / 深红
- 详情按钮：中性深色按钮

这样可以保留不同持仓卡的辨识度，但不会像旧版那样出现浅色大底与黑夜主题冲突。

## 7. 错误处理与边界

1. 持仓加载失败
- 页面显示“持仓加载失败，请稍后重试”，不渲染卡片网格

2. 报价刷新失败
- 尽量保留现有持仓展示，避免整页闪空

3. 快照失败
- 单张 `PositionCard` 内部显示“走势加载失败”或“暂无走势数据”
- 不影响买卖操作

4. 标的无效
- 搜索结果缺少 `instrument_id` 时会阻止买入并提示错误

5. 全局错误
- 统一由 `api.js` 拦截 401、刷新 token 和错误提示节流

## 8. 当前版本的实现边界

当前投资模块已经覆盖“查询 + 报价刷新 + 买卖 + 图表”主链路，但仍有一些明确边界：

- 详情按钮目前仍是“功能开发中”提示
- 高级模式 UI 已预留，但逻辑尚未展开
- Analysis / Tools 页还未和投资域形成联动分析视图

## 9. 阅读源码建议

推荐按这个顺序读：

1. `src/pages/Investment.vue`
2. `src/stores/investment.js`
3. `src/components/cards/investmentCards/PositionCard.vue`
4. `src/components/windows/TradePositionPanel.vue`
5. `src/components/cards/investmentCards/AddPositionCard.vue`
6. `src/utils/investment.js` / `src/utils/snapshot.js`
