# 行情功能实现说明

## 1. 功能目标

行情页面用于管理用户自选标的并查看最新行情，当前已实现：

- 拉取并展示自选行情列表
- 按市场筛选（全部 / A股 / 港股 / 美股 / 外汇 / 加密货币）
- 搜索标的并添加到自选
- 删除自选标的
- 显示更新时间与涨跌状态
- 页面回到前台时静默刷新

## 2. 文件与调用链

### 2.1 页面与编排

- 页面：`src/pages/Market.vue`
- 组合函数：`src/composables/useMarketPage.js`

`Market.vue` 负责展示与事件绑定，交互和数据编排集中在 `useMarketPage()`。

### 2.2 数据源

- store：`src/stores/market.js`
- API：`src/utils/markets.js`

调用关系：

1. `Market.vue` 调用 `useMarketPage()`
2. `useMarketPage()` 从 `marketStore` 取状态并封装格式化函数
3. 页面触发搜索、添加、删除、筛选
4. 组合函数调用 store 或 API 并回写状态

## 3. API 请求与参数

### 3.1 自选行情列表

- `GET /user/markets/`
- 对应 store 方法：`fetchMarkets({ force, silent })`

### 3.2 搜索标的

- `GET /user/markets/search/?q=...&limit=...`
- 对应：`searchMarketInstruments(query)`

### 3.3 添加自选

- `POST /user/markets/watchlist/`
- body：`{ symbol }`

### 3.4 删除自选

- `DELETE /user/markets/watchlist/`
- body：`{ market, short_code }`

## 4. 页面布局与交互

### 4.1 顶部工具区

顶部包含三块：

1. 市场筛选下拉
- 显示当前市场标签与数量
- 使用 `dropdown-trigger / dropdown-panel` 体系

2. 搜索输入框
- 输入股票代码或名称
- 支持防抖搜索和即时 Enter 搜索
- 下方显示搜索结果下拉

3. 更新时间文本
- 显示后端返回的最新更新时间
- 当前文案为“每 10 分钟更新”

### 4.2 主表格

表格字段包括：

- 市场
- 代码
- 名称
- 最新价
- 涨跌幅
- 今日最高
- 今日最低
- 昨收
- 成交量（亿）
- 删除按钮

### 4.3 搜索交互细节

- 输入法组合输入由 `compositionstart/end` 保护
- 同一关键字优先使用缓存结果
- 使用 `searchRequestSeq` 避免旧请求覆盖新结果
- 输入框失焦后延迟关闭结果面板，保证点击结果不丢失

## 5. Store 与核心函数职责

主 store：`src/stores/market.js`

### 5.1 核心状态

- `markets`
- `updatedAt`
- `selectedMarket`
- `loading`
- `error`

### 5.2 核心方法

- `fetchMarkets({ force, silent })`
- `refreshMarkets({ silent })`
- `addWatchlistInstrument(symbol)`
- `deleteWatchlistInstrument(payload)`
- `setSelectedMarket(market)`
- `startMarketAutoRefresh()`
- `stopMarketAutoRefresh()`

### 5.3 当前实现点

1. 市场排序
- 按 `CN -> HK -> US -> FX -> CRYPTO` 排序

2. 选中市场持久化
- 使用 `STORE_REFRESH_CONFIG.market.selectedMarketStorageKey`

3. 搜索缓存
- `useMarketPage()` 内部维护 `Map` 缓存
- 缓存上限由 `SEARCH_CONFIG.marketPage.cacheLimit` 控制

4. 页面回前台刷新
- `useMarketPage()` 监听 `visibilitychange`
- 只有在 `AUTO_REFRESH_ENABLED` 打开时才执行静默刷新

## 6. 错误处理与边界

1. 搜索失败
- 仅清空搜索态，不影响主表格

2. 自选删除失败
- 失败时保留当前列表，错误提示走全局拦截

3. 市场失效回退
- 当当前选中市场在新数据中不存在时，自动回退到 `ALL`

4. 空数据
- 页面显示“未找到符合条件的行情数据”

## 7. 当前版本特点

- 行情页已接入统一深色 token 风格
- 搜索结果面板、市场下拉、表格均使用共享样式基类
- 页面主体为单大卡布局，不再拆成多个小组件

## 8. 阅读源码建议

1. `src/pages/Market.vue`
2. `src/composables/useMarketPage.js`
3. `src/stores/market.js`
4. `src/utils/markets.js`
5. `src/styles/style.css`
