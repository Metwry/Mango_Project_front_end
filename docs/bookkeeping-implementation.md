# 记账功能实现说明

## 1. 功能概览

记账页面用于管理手工交易流水，当前支持：

- 按模式查看记录（活动记录 / 投资记录 / 已撤销记录）
- 多条件筛选（账户、交易方、备注、起止日期）
- 分页浏览
- 新增交易
- 撤销交易
- 删除单条记录
- 按当前模式全部删除

核心目标是保持：交易记录、账户余额、用户反馈 三者一致。

## 2. 相关文件

### 2.1 页面与组合函数

- 页面：`src/pages/Bookkeeping.vue`
- 组合函数：`src/composables/useBookkeepingPage.js`

### 2.2 组件

- `src/components/cards/bookkeepingCards/TransactionsHistoryCard.vue`
- `src/components/windows/AddTransaction.vue`

### 2.3 数据与 API

- `src/stores/transaction.js`
- `src/stores/accounts.js`
- `src/utils/transaction.js`
- `src/utils/api.js`

## 3. 页面布局与当前交互

`Bookkeeping.vue` 当前是“单主卡 + 弹窗录入”结构。

主卡 `TransactionsHistoryCard` 包含：

- 模式切换
- 记录计数
- 记账按钮
- 全部删除按钮
- 筛选区
- 交易表格
- 分页区

当前移动端已经做过紧凑化处理：

- 搜索筛选区不会长期占用过多纵向空间
- 表格区与分页区保持单主卡布局
- 弹窗使用 `Teleport` 挂载到 `body`

## 4. API 请求设计

### 4.1 模式映射

前端模式到后端 `activity_type` 的映射由交易模块内部处理。

当前文档层面只需要知道：

- 活动记录对应手工记录
- 投资记录对应投资流水
- 已撤销记录对应 reversal 流程

### 4.2 端点

- 查询列表：`GET /user/transactions/`
- 新增：`POST /user/transactions/`
- 撤销：`POST /user/transactions/{id}/reverse/`
- 删除单条 / 删除当前模式全部：`POST /user/transactions/delete/`

## 5. Store 与页面编排

### 5.1 `transaction.js`

职责：

- 持有交易列表、总数、筛选条件、错误状态
- 负责查询、新增、撤销、删除
- 维护分页与当前模式

关键方法：

- `setFilters(patch)`
- `resetFilters()`
- `fetchList(extraParams)`
- `createOne(payload)`
- `removeOne(id)`
- `removeAllByCurrentMode()`
- `reverseOne(id)`
- `reset()`

### 5.2 `useBookkeepingPage`

职责：

- 组合 `transactionsStore + accountsStore`
- 负责初始化加载
- 负责查询、重置、页码切换、模式切换
- 负责提交、撤销、删除等页面级交互

成功写操作后会联动刷新：

- `accountsStore.fetchAccounts({ force: true })`
- 当前交易列表页或第一页

## 6. 组件职责

### 6.1 TransactionsHistoryCard

职责：

- 只做展示和事件抛出
- 不直接调用 API
- 管理筛选区、表格、分页、下拉显隐

当前关键点：

- 使用 `SmallAccountPicker` / `DatePicker`
- 表格支持金额色、类别胶囊、危险按钮
- 分页与 page size 使用统一 dropdown 样式

### 6.2 AddTransaction

职责：

- 弹窗表单录入
- 基础表单校验
- 提交 payload 标准化

当前关键点：

- 仅允许选择非投资账户
- 时间默认当前时间
- 高级模式 UI 保留，但逻辑仍未展开

## 7. 错误处理与边界

1. 删除 / 撤销
- 统一二次确认

2. 提交类动作
- 有本地 submitting 状态，避免重复触发

3. 请求失败
- 统一通过 `api.js` 处理 token 刷新和错误节流

4. 当前边界
- 记账模块还没有前台编辑功能
- 仍以新增 / 查询 / 撤销 / 删除 为主链路

## 8. 阅读源码建议

1. `src/pages/Bookkeeping.vue`
2. `src/composables/useBookkeepingPage.js`
3. `src/stores/transaction.js`
4. `src/components/cards/bookkeepingCards/TransactionsHistoryCard.vue`
5. `src/components/windows/AddTransaction.vue`
