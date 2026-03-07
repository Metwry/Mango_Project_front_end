# 记账功能实现说明

## 1. 功能概览

记账页面用于管理手工交易流水，支持：

- 按模式查看记录（活动记录 / 交易记录 / 已撤销记录）
- 多条件筛选（账户、交易方、备注、起止日期）
- 分页浏览
- 新增交易
- 撤销交易（自动生成撤销记录）
- 删除单条记录
- 按当前模式全部删除

核心目标是保证交易列表、账户余额、用户提示三者同步。

---

## 2. 相关文件

### 页面与组合函数

- `src/pages/Bookkeeping.vue`
- `src/composables/useBookkeepingPage.js`

### 组件

- `src/components/cards/bookkeepingCards/TransactionsHistoryCard.vue`
- `src/components/windows/AddTransaction.vue`

### 状态与 API

- `src/stores/transaction.js`
- `src/stores/accounts.js`（用于交易后刷新账户）
- `src/utils/transaction.js`
- `src/utils/api.js`（统一 axios 实例与错误处理）

---

## 3. 页面布局与风格

`Bookkeeping.vue` 采用左右一体的“单主卡 + 弹窗表单”结构：

- 主体是 `TransactionsHistoryCard`：
  - 顶部：模式切换、记录计数、记账按钮、全部删除按钮
  - 中部：筛选区 + 表格区
  - 底部：分页区
- 录入使用 `AddTransaction` 弹窗：
  - 账户、交易方、类型、金额、交易时间
  - 提交 / 重置

视觉风格沿用项目现有 Tailwind + card 体系：

- 浅色/深色双主题
- 表格吸顶表头、行 hover、状态色（涨跌色）
- 重要动作（删除）使用红色强调样式

---

## 4. API 请求设计

API 封装集中在 `src/utils/transaction.js`。

### 4.1 交易模式映射

前端模式到后端 `activity_type`：

- `activity` -> `manual`
- `all` -> `investment`
- `reversed` -> `reversed`

### 4.2 端点列表

- 查询列表：`GET /user/transactions/`
  - 参数含分页、筛选、排序、`activity_type`
- 新增：`POST /user/transactions/`
- 撤销：`POST /user/transactions/{id}/reverse/`
- 删除单条：`POST /user/transactions/delete/`（`mode=single`）
- 删除当前模式全部：`POST /user/transactions/delete/`（`mode=activity`）

---

## 5. Store 设计（transactions）

`src/stores/transaction.js` 采用 Pinia setup store，职责是“交易列表状态 + CRUD 行为”。

### 5.1 状态字段

- `items`：当前页交易列表
- `total`：总数
- `loading`：列表加载中
- `error`：最近一次错误
- `filters`：筛选与分页参数（含 `history_mode`）

### 5.2 关键方法

- `setFilters(patch)`：合并筛选条件
- `resetFilters()`：重置为默认筛选
- `fetchList(extraParams)`：按当前筛选拉列表
- `createOne(payload)`：新增一条交易
- `removeOne(id)`：删除单条并处理空页回退
- `removeAllByCurrentMode()`：删除当前模式全部后回到第一页
- `reverseOne(id)`：撤销并刷新当前页
- `reset()`：登出或切换账户时清空状态

### 5.3 参数清洗

`fetchList` 内会清洗参数（删除 `null/undefined/""`），减少无效 query 参数传递。

---

## 6. 页面组合层（useBookkeepingPage）

`src/composables/useBookkeepingPage.js` 负责把“页面交互”编排为可复用动作。

### 6.1 对外暴露

- 视图状态：`accounts`、`transactions`、`loading/error`、分页与模式等
- 交互函数：
  - `onSearchChange/onSearchReset`
  - `onPageChange/onPageSizeChange`
  - `onModeChange`
  - `onSubmitTransaction`
  - `onReverseTransaction`
  - `onDeleteOne/onDeleteAll`

### 6.2 统一流程

- 初始化：`onMounted` 并发请求账户列表 + 交易列表
- 交易成功后：并发刷新
  - 账户：`accountsStore.fetchAccounts({ force: true })`
  - 交易：`updateAndFetch({ page: 1 })` 或当前页刷新
- 危险操作前统一二次确认（`ElMessageBox.confirm`）
- 提交类动作统一走 `withSubmitting`，避免按钮状态失控

---

## 7. 组件行为细节

## 7.1 TransactionsHistoryCard

主要职责：

- 展示筛选器、表格和分页
- 负责纯展示与事件抛出（`emit`）
- 不直接做 API 请求

关键点：

- 使用 `SmallAccountPicker` + `DatePicker` 作为筛选输入
- 金额/标签颜色按交易方向动态计算
- 模式切换与 page size 下拉使用点击外部关闭
- 表格操作只发事件：`reverse/delete-one/delete-all`

## 7.2 AddTransaction

主要职责：

- 交易录入弹窗
- 表单校验（最小必填：账户 + 金额）
- 提交 payload 标准化后抛给父级

关键点：

- 仅允许非投资账户（`filterNonInvestmentAccounts`）
- 时间字段默认当前时间；手动修改后保持用户输入

---

## 8. 错误处理与用户反馈

- 网络与后端错误由 `src/utils/api.js` 全局拦截
- 记账交互成功反馈由 `ElMessage.success`
- 危险操作（删除/撤销）统一确认框
- 删除、清空、提交均有本地 `loading/submitting` 状态，防止重复触发

---

## 9. 当前实现边界

当前记账流程为“新增 / 查询 / 撤销 / 删除”，不包含前台编辑（update/patch）入口。

如果后续要加“编辑交易”：

- API 层补回 `PUT/PATCH` 接口函数
- store 增加 `updateOne/patchOne`
- 表格新增编辑按钮 + 弹窗复用 `AddTransaction` 或单独编辑窗

---

## 10. 一次完整交互示例

“新增一条交易”的前端链路：

1. 用户在 `AddTransaction` 填写并点击提交
2. `Bookkeeping.vue` 接收 `submit` 事件并调用 `onSubmitTransaction`
3. `useBookkeepingPage` 调用 `transactionsStore.createOne`
4. 成功后并发刷新账户与交易列表
5. 交易表格和账户余额同时更新，弹窗关闭

这套链路确保“列表和余额一致”。
