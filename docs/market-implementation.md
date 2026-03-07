# 行情功能实现说明

## 1. 功能目标

行情页面用于维护用户自选标的并查看最新行情，核心能力：

- 拉取并展示自选行情列表
- 按市场分组筛选（全部/A股/港股/美股/外汇/加密）
- 搜索标的并加入自选
- 删除自选标的
- 显示更新时间与行情涨跌状态

---

## 2. 文件与调用链

## 2.1 页面与编排

- 页面：`src/pages/Market.vue`
- 组合函数：`src/composables/useMarketPage.js`

`Market.vue` 主要承担展示和事件绑定，业务逻辑集中在 `useMarketPage`。

## 2.2 数据与状态源

- Store：`src/stores/market.js`
- API：`src/utils/markets.js`

调用关系：

1. `Market.vue` 调用 `useMarketPage`
2. `useMarketPage` 通过 `storeToRefs(useMarketStore())` 获取状态
3. 页面交互触发 store action（查询、添加、删除、刷新）

---

## 3. API 请求与参数

1. 获取用户自选行情  
- `GET /user/markets/`  
- store：`fetchMarkets({ force, silent })`

2. 搜索标的  
- `GET /user/markets/search/?q=...&limit=...`  
- composable：`executeSearch()`

3. 添加自选  
- `POST /user/markets/watchlist/`  
- body：`{ symbol }`

4. 删除自选  
- `DELETE /user/markets/watchlist/`  
- body：`{ market, short_code }`

---

## 4. 页面布局与交互

页面结构：

1. 顶部工具区
- 自选市场下拉筛选
- 搜索输入框与搜索结果下拉
- 更新时间文本

2. 主体行情表格
- 市场、代码、名称、最新价、涨跌幅、最高/最低、昨收、成交量、删除操作

交互机制：

- 搜索：防抖 + 请求序号去抖（避免旧请求覆盖新结果）
- 缓存：Map 缓存最近查询结果（减少重复请求）
- 组合输入：处理中文输入法 `compositionstart/end`
- 页面回前台：可选触发 `visibilitychange` 刷新（受 `AUTO_REFRESH_ENABLED` 控制）

---

## 5. Store 与核心函数职责

`src/stores/market.js` 负责行情数据生命周期管理。

核心状态：

- `markets`：按市场分块后的行情数据
- `updatedAt`：后端更新时间
- `selectedMarket`：当前筛选市场（本地持久化）
- `loading/error`

核心函数：

- `fetchMarkets({ force, silent })`
- `refreshMarkets({ silent })`
- `addWatchlistInstrument(symbol)`
- `deleteWatchlistInstrument(payload)`
- `setSelectedMarket(market)`

关键实现点：

- `fetchPromise` 并发复用，避免重复请求
- 强制刷新时等待当前请求完成后再发新请求
- `selectedMarket` 通过 localStorage 保存
- 自动刷新通过 `createMinuteAlignedScheduler`，并受全局开关控制

---

## 6. 错误处理与边界

1. 搜索失败
- 仅重置搜索状态，不中断主列表显示。

2. 刷新失败
- `silent` 场景下尽量保持现有列表，避免闪空。

3. 全局错误提示
- 统一由 `api.js` 拦截并节流去重。

4. 市场有效性
- 当前选中市场在新数据中不存在时，自动回退到 `ALL`。

---

## 7. 本轮保守清理记录

- 保持 `Market.vue + useMarketPage + marketStore` 结构不变；
- 收敛 store 对外暴露，只保留实际消费字段，移除未被页面使用的返回项（`fetched`、`lastFetchedAt`）；
- 未修改接口协议、列表结构与交互行为。
