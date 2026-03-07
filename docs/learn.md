# 前端技术学习文档（结合本项目实战）

本文档面向“想通过项目源码系统学习”的开发者。

这次版本不再只列基础点，而是把本项目里真实出现、并且足够常用的知识点尽量铺开。每个知识点都尽量回答四件事：

1. 它是什么
2. 怎么用
3. 适合什么场景
4. 本项目里可以看哪个例子

不追求冷门覆盖，重点覆盖 Vue 3 项目里高频、能立刻迁移到其它业务项目的内容。

---

## 1. 如何阅读本项目（升级版路线）

推荐按这个顺序读：

1. `src/main.js`
2. `vite.config.js`
3. `src/config/Config.js`
4. `src/router/index.js`
5. `src/pages/Home.vue`
6. 任一业务页：`Dashboard.vue` / `Bookkeeping.vue` / `Market.vue` / `Investment.vue`
7. 对应 `composable`
8. 对应 `store`
9. 对应 `src/utils/*.js`
10. `src/utils/api.js`
11. `src/utils/refreshScheduler.js`
12. `src/styles/style.css`

这样读的原因：

- `main.js` 看应用怎么启动
- `vite.config.js` 看构建和代理
- `Config.js` 看环境变量如何落地
- `router` 看页面入口和权限控制
- `Home.vue` 看整体布局壳和页面切换
- 页面 / composable / store / utils 能串起完整数据流
- `style.css` 看全局样式设计和语义类体系

你可以把整个项目理解为一条固定链路：

`页面组件 -> composable -> store -> utils API -> axios 实例 -> 后端`

---

## 2. 工程与构建层知识点

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| ESM 模块化 | 用 `import` / `export` 组织代码，按功能拆模块 | 前端工程化项目的基础模块系统 | `src/main.js`、`src/utils/api.js`、`src/stores/*.js` |
| 路径别名 `@` | 用 `@/xxx` 指向 `src/xxx`，避免很多 `../../..` | 项目目录变深后，提升导入可读性 | `vite.config.js` 里定义别名；全项目大量使用如 `@/stores/auth` |
| `import.meta.env` | 读取 Vite 环境变量 | 不同环境使用不同 API 地址、刷新频率、超时时间 | `src/config/Config.js` |
| `loadEnv` | 在 `vite.config.js` 里读取当前模式环境变量 | 开发服务器 host、port、代理地址需要随环境变化 | `vite.config.js` |
| 配置集中管理 | 先把环境变量读进 `Config.js`，业务代码只读配置常量 | 避免在组件和 store 里散落 `import.meta.env` | `src/config/Config.js`、`src/utils/api.js`、`src/stores/market.js` |
| `Object.freeze` | 冻结配置对象，避免运行时被误改 | 配置项、常量字典、模式映射 | `AUTH_ENDPOINTS`、`STORE_REFRESH_CONFIG`、`TRANSACTION_HISTORY_MODE` |
| 路由懒加载 | `component: () => import("...")` | 首屏只加载必要页面，减少初始包体积 | `src/router/index.js` |
| 动态 import | 在函数内部按需加载模块 | 某些模块只在特定流程里需要，减少耦合 | `src/stores/auth.js` 的 `loadAppStores()`、`src/stores/investment.js` 的 `refreshAccountsAfterTrade()` |
| 开发代理 | Vite `server.proxy` 把 `/api` 转发到后端 | 本地开发时解决跨域，前端保持统一请求前缀 | `vite.config.js` |
| 插件注册 | 在 Vite 中注册 Vue、Tailwind、devtools 等插件 | 编译 `.vue` 文件、启用 Tailwind、增强开发体验 | `vite.config.js` |

---

## 3. JavaScript 高频知识点（项目实战版）

### 3.1 安全取值与数据归一化

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| 可选链 `?.` | `obj?.a?.b` | 后端字段可能缺失时，避免读取时报错 | `src/utils/api.js`、`src/stores/investment.js`、`src/components/cards/investmentCards/PositionCard.vue` |
| 空值合并 `??` | `value ?? fallback` | 只在 `null/undefined` 时回退默认值 | `src/config/Config.js`、`src/stores/auth.js` |
| `String()` 归一化 | `String(value ?? "").trim()` | 接口字段类型不稳定时先转成字符串再处理 | `src/stores/market.js`、`src/composables/useMarketPage.js` |
| `Number()` + `Number.isFinite()` | 把输入转成数值并校验 | 表单输入、接口响应、图表数据、金额计算 | `src/stores/investment.js`、`src/utils/formatters.js`、`src/components/cards/dashboardCards/TrendCard.vue` |
| 参数清洗 | 删除 `null` / `undefined` / `""` | 请求 query 参数不应把空值传给后端 | `sanitizeParams()` in `src/stores/transaction.js` |
| 响应归一化 | 把不同接口格式统一成前端需要的数据结构 | 后端返回结构不完全一致时，前端边界统一处理 | `normalizeMarkets()`、`normalizePosition()`、`normalizeUsdPerCurrencyRates()` |

### 3.2 常见数据结构与集合操作

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| `Map` | 键值索引，查找效率高 | 根据 id、时间戳、复合键建立索引 | `latestMap` in `src/stores/investment.js`、`accountMap` in `TransactionsHistoryCard.vue` |
| `Set` | 唯一值集合 | 去重、判断是否已存在 | `buildQuoteItems()` in `src/stores/investment.js`、`ensureSelectedMarketAvailable()` in `useMarketPage.js` |
| `Object.entries()` | 把对象转成 `[key, value]` 数组 | 遍历配置字典、汇率对象 | `modeOptions` in `src/composables/useLoginPage.js`、`src/utils/fxRates.js` |
| `Object.values()` | 提取对象值数组 | 统计搜索条件是否存在、筛选有效项 | `TransactionsHistoryCard.vue` 中 `hasSearch`、`activeSearchCount` |
| `Array.map()` | 一项映射成另一项 | 接口数据转 UI 数据 | `normalizeMarkets()`、`chartSeries`、`monthOptions` |
| `Array.filter()` | 过滤无效项 | 移除空值、只保留满足条件的数据 | `normalizeMarkets()`、`trendSeries` 处理、`searchableAccounts` |
| `Array.reduce()` | 累加和、构造对象、聚合结果 | 求总额、构造索引、拼装时间线 | `navOrderMap` in `Home.vue`、`buildAccountsValuation()`、`FundProportionCard.vue` |
| `Array.sort()` | 自定义排序 | 市场顺序、时间序、金额大小排序 | `useMarketPage.js`、`AccountListCard.vue`、`TrendCard.vue` |
| `Array.flatMap()` | 先映射再拍平 | 提取图表所有时间点 | `xAxisBounds` in `TrendCard.vue` |
| `find()` / `some()` | 查找单项 / 判断是否存在 | 找选中账户、判断是否有搜索项 | `selectedAccount`、`hasSearch`、`rangeMeta` |
| `localeCompare()` | 按本地化规则排序字符串 | 中文或多语言标签排序更稳妥 | `useMarketPage.js` |

### 3.3 异步控制与竞态保护

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| `async/await` | 用同步写法组织异步流程 | 登录、取列表、提交表单、交易下单 | 全项目 store / composable 中高频使用 |
| `Promise.all()` | 并发执行多个必须一起完成的请求 | 页面初始化、交易后同步刷新多个资源 | `src/composables/useBookkeepingPage.js`、`src/stores/investment.js` |
| `Promise.allSettled()` | 并发执行，但允许部分失败 | 初始化多个模块时不希望一个失败拖垮全部流程 | `initializeAppStores()` in `src/stores/auth.js`、`src/pages/Investment.vue` |
| `try/catch/finally` | 异步过程里维护 loading / error / 收尾 | 提交按钮、列表请求、自动刷新 | 几乎所有 store action |
| Promise 缓存模式 | `if (fetchPromise.value) return fetchPromise.value` | 多组件同时请求同一资源时避免重复 HTTP | `src/stores/accounts.js`、`src/stores/market.js`、`src/stores/investment.js` |
| 请求序号保护 | 用 `requestSeq` / `reqId` 只接受最后一次请求结果 | 搜索输入频繁变化、图表快速切换时避免旧结果覆盖新结果 | `useMarketPage.js`、`PositionCard.vue`、`TrendCard.vue` |
| “强制刷新先等旧请求结束” | `force` 时先等待旧 Promise 收尾再继续 | 防止刷新按钮和自动刷新并发时状态错乱 | `fetchAccounts()`、`fetchMarkets()`、`fetchPositions()` |
| 静默刷新 | `silent: true` 时不清空旧界面，只后台更新 | 自动刷新、页面恢复前台时体验更平滑 | `src/stores/market.js`、`src/stores/investment.js` |

### 3.4 本地持久化与序列化

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| `localStorage` | 长期保存登录态、主题、筛选偏好 | “记住我”、主题切换、自选市场记忆 | `src/stores/auth.js`、`src/stores/market.js`、`src/components/windows/SettingsModal.vue` |
| `sessionStorage` | 会话级保存数据 | 用户不勾选“记住登录”时只保留到当前会话 | `src/stores/auth.js` |
| `JSON.parse` / `JSON.stringify` | 对象写入存储前序列化，读出后反序列化 | 存用户对象、复杂配置 | `parseUser()`、`persistAuthState()` in `src/stores/auth.js` |
| 双存储切换 | 目标存储写入前，清理影子存储 | 防止 local 和 session 同时残留旧 token | `persistAuthState()` in `src/stores/auth.js` |

### 3.5 数字、货币、时间格式化

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| `Intl.NumberFormat` | 本地化数字 / 货币格式化 | 金额、持仓数量、图表 tooltip | `src/utils/formatters.js`、`PositionCard.vue`、`TrendCard.vue` |
| 手动格式化符号 | 当标准 currency 格式不适用时，自己拼接币种符号 | 外汇、前缀显示、只显示符号不显示 ISO 码 | `formatCurrencyAmount()` in `src/utils/formatters.js` |
| `Date` + `toISOString()` | 生成后端可识别的 ISO 时间窗口 | 查询快照、走势图、按日期筛选 | `PositionCard.vue`、`TrendCard.vue` |
| `toLocaleString()` | 浏览器本地化展示时间 | 更新时间、简易时间展示 | `formatUpdatedAt()` in `useMarketPage.js` |
| Day.js | 解析、格式化、比较日期 | 日期选择器、交易时间展示、禁选未来日期 | `src/components/ui/DatePicker.vue`、`TransactionsHistoryCard.vue` |

---

## 4. Vue 3 核心知识点（Composition API）

### 4.1 组件脚本组织

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| `<script setup>` | 直接在顶层声明响应式变量和函数，模板可直接使用 | Vue 3 SFC 主流写法，代码更短更清晰 | 全项目组件基本都采用 |
| `defineProps()` | 定义父传子入参 | 可复用 UI 组件、业务卡片组件、弹窗组件 | `AccountPicker.vue`、`PositionCard.vue`、`TransactionsHistoryCard.vue` |
| `defineEmits()` | 定义组件向外派发事件 | 子组件把用户操作通知父组件 | `AddTransaction.vue`、`TradePositionPanel.vue`、`DatePicker.vue` |
| `defineModel()` | 在 Vue 3.4+ 里简化自定义 `v-model` | 小型表单组件、选择器组件 | `src/components/ui/SmallAccountPicker.vue` |
| 自定义 `v-model` 协议 | 通过 `modelValue` + `update:modelValue` 实现双向绑定 | 组件内部维护选择状态，但结果交给父级接管 | `AccountPicker.vue`、`DatePicker.vue` |

### 4.2 响应式基础

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| `ref()` | 包装基础类型或 DOM 引用 | `loading`、`open`、`inputRef`、`timer` | 全项目高频 |
| `reactive()` | 包装对象结构 | 搜索表单、交易表单、筛选器对象 | `src/stores/transaction.js`、`AddTransaction.vue`、`TransactionsHistoryCard.vue` |
| `computed()` | 派生状态，避免模板里堆逻辑 | 当前标题、筛选结果、格式化文本、class、chart option | `Home.vue`、`useMarketPage.js`、`TrendCard.vue` |
| 计算属性拆 UI 逻辑 | 把 `title`、`badgeClass`、`selectedLabel` 这些从模板抽出去 | 模板更干净，便于测试和维护 | `PositionCard.vue`、`Market.vue`、`Topbar.vue` |

### 4.3 响应式副作用与生命周期

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| `watch()` | 监听响应式值变化，执行副作用 | 路由切换动画、输入搜索、图表重算、同步表单状态 | `Home.vue`、`PositionCard.vue`、`TrendCard.vue` |
| 监听多个源 | `watch([a, b], ...)` | 两个条件任一变化都要重新拉取或重算 | `PositionCard.vue`、`TrendCard.vue` |
| `immediate: true` | 让 watch 在初始化时先执行一次 | 既想监听变化，也想初次挂载立即跑逻辑 | `PositionCard.vue`、`TrendCard.vue` |
| `onMounted()` | 组件挂载后执行初始化逻辑 | 首次请求、注册监听、启动定时器 | `Home.vue`、`Investment.vue`、`useDashboardWorth.js` |
| `onUnmounted()` | 组件销毁时清理资源 | 清理定时器、监听器、倒计时、观察器 | `Home.vue`、`useLoginPage.js`、`PositionCard.vue` |
| `nextTick()` | 等 DOM 更新后再测量或聚焦 | 文本溢出测量、动画前后 DOM 已更新的场景 | `PositionCard.vue`、`TradePositionPanel.vue` |

### 4.4 模板能力与事件系统

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| 条件渲染 `v-if / v-else-if / v-else` | 根据状态显示不同 UI | loading / error / empty / success 四态界面 | 所有页面和卡片组件 |
| 列表渲染 `v-for` | 渲染动态列表 | 账户列表、交易列表、市场列表、年份月份列表 | `Market.vue`、`TransactionsHistoryCard.vue`、`DatePicker.vue` |
| 动态 class / style 绑定 | `:class`、`:style` | 根据盈亏、主题、弹层位置切换样式 | `PositionCard.vue`、`Market.vue`、`SmallAccountPicker.vue` |
| 事件修饰符 | `@click.stop`、`@mousedown.prevent` | 阻止冒泡、避免 blur 导致点击选项失效 | `TransactionsHistoryCard.vue`、`Market.vue` |
| `v-model` 修饰符 | `v-model.trim`、`v-model.number` | 自动去空格、自动转数字 | `Login.vue`、`AddAccount.vue`、`ChangeAccount.vue` |

### 4.5 内置组件与高级模板模式

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| `RouterView` | 当前路由对应页面出口 | 单页应用页面切换入口 | `Home.vue` |
| `RouterView v-slot` | 拿到 `Component` 和 `route` 再自行包裹 | 想给页面切换加 `Transition`、自定义 key | `Home.vue` |
| 动态组件 `<component :is="Component" />` | 运行时渲染不同组件 | 配合路由插槽、动态页面切换 | `Home.vue` |
| `Transition` | 给进入 / 离开元素加动画类 | 页面切换、下拉框、弹窗、移动端筛选面板 | `Home.vue`、`DatePicker.vue`、`TransactionsHistoryCard.vue` |
| `Teleport` | 把节点挂到 `body` 等外层容器 | 弹窗、浮层避免被父容器 `overflow` 截断 | `AddTransaction.vue`、`DatePicker.vue`、`AccountPicker.vue` |

### 4.6 composable 模式

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| composable 抽逻辑 | 把页面交互逻辑从 SFC 中抽出成函数 | 页面逻辑较多，希望模板更轻、逻辑更复用 | `useMarketPage.js`、`useBookkeepingPage.js`、`useLoginPage.js` |
| composable 聚合 store | composable 内统一拿 store、拼接 UI 行为 | 页面要同时协调多个 store 时 | `useBookkeepingPage.js`、`useDashboardWorth.js` |
| composable 共享状态 | 把 `ref` 放在函数外，多个调用方共享同一份状态 | 仪表盘多个组件共享估值结果 | `sharedValuedAccounts` in `src/composables/useDashboardWorth.js` |

### 4.7 Pinia 与 Vue 配合

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| `storeToRefs()` | 把 store state 解构成保持响应式的 ref | 解构 store 时避免失去响应性 | `useMarketPage.js`、`Investment.vue`、`useDashboardWorth.js` |
| store action 直接调用 | 状态从 `storeToRefs` 取，方法从 store 实例本身调用 | 读写职责分明 | `investmentStore.fetchPositions()` + `const { positions } = storeToRefs(investmentStore)` |

### 4.8 样式作用域

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| `<style scoped>` | 样式只作用于当前组件 | 组件局部动画和外观，不污染全局 | `Home.vue`、`PositionCard.vue`、`Topbar.vue` |
| `:deep()` | 穿透到子组件内部元素样式 | 当前组件想调整子组件内部类名样式 | `TransactionsHistoryCard.vue` 对 `SmallAccountPicker`、`DatePicker` 的移动端样式覆盖 |
| `:global()` | 写一个不受 `scoped` 限制的选择器 | 某个局部文件中需要影响全局主题态 | `TransactionsHistoryCard.vue` 中 `:global(.dark)` |
| `<style scoped src="...">` | 复用共享样式文件 | 多个模态框共享同一套弹窗样式 | `AddAccount.vue`、`AddTransaction.vue`、`UserProfileModal.vue` |

---

## 5. Pinia、Router、API 架构层知识点

### 5.1 Pinia 状态管理

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| Setup Store | `defineStore("name", () => { ... })` | Vue 3 Composition API 风格的状态管理 | `src/stores/auth.js`、`accounts.js`、`market.js` |
| store 内聚业务逻辑 | 请求、归一化、错误处理、刷新逻辑都放在 store | 避免页面组件直接写请求细节 | 所有 `src/stores/*.js` |
| store `reset()` | 统一清空状态和副作用 | 登出、切换账号、重新初始化应用 | `auth.logout()` 会调用各 store 的 `reset()` |
| store 显式错误状态 | `error`、`actionError`、`tradeError` | 页面可以根据错误态渲染 UI，调用者也能继续控制流程 | `accounts.js`、`investment.js` |
| store 暴露有限状态 | 只把页面需要的状态返回出去 | 减少组件直接接触内部细节 | 各 store 的 `return` 区域 |

### 5.2 路由管理

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| `createWebHistory()` | 使用 History 模式路由 | 更干净的 URL，不带 `#` | `src/router/index.js` |
| 嵌套路由 | 父布局包裹多个业务页 | 统一 Sidebar / Topbar / 页面壳 | `/` 下的 `children` in `src/router/index.js` |
| `redirect` | 进入父路由时跳到默认页 | 首页自动落到仪表盘 | `redirect: "/dashboard"` |
| `meta` | 给路由附加标题、图标、鉴权标记 | 导航展示、页面标题、权限判断 | `src/router/index.js`、`Home.vue` |
| 全局守卫 `beforeEach` | 进入页面前判断登录状态 | 未登录跳登录页、已登录禁止回登录页 | `src/router/index.js` |

### 5.3 Axios 与 API 层

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| axios 单例 | `axios.create()` 后全项目复用一个实例 | 统一 baseURL、超时、请求头、拦截器 | `src/utils/api.js` |
| request 拦截器 | 发请求前统一加 token 或特殊 header | 鉴权接口、ngrok header 注入 | `src/utils/api.js` |
| response 拦截器 | 统一处理错误、401、重试逻辑 | 避免每个页面自己写重复错误处理 | `src/utils/api.js` |
| token 自动刷新 | 401 时用 refresh token 换新 access token | 前端自动续期登录态 | `src/utils/api.js` |
| 刷新队列 | 刷新 token 时，把后续 401 请求排队等待 | 避免多个 401 同时触发多次 refresh | `isRefreshing` + `requestsQueue` in `src/utils/api.js` |
| 错误提示节流去重 | 控制 toast 的时间窗口和重复消息 | 网络抖动、页面恢复前台时避免刷屏 | `notifyError()`、`shouldSuppressErrorToast()` |
| API 响应辅助函数 | `getPayload()`、`getResultsList()`、`getPagedList()` | 后端返回格式不完全统一时，前端集中适配 | `src/utils/api.js` |
| domain API 模块 | 每个业务域有自己的请求函数文件 | 接口路径与页面逻辑解耦 | `src/utils/markets.js`、`investment.js`、`transaction.js` |
| DELETE 携带请求体 | `api.delete(url, { data: payload })` | 某些后端删除接口要求 body 参数 | `deleteWatchlistInstrument()` in `src/utils/markets.js` |

### 5.4 自动刷新调度

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| 工具函数封装调度器 | 把定时逻辑写成 `createMinuteAlignedScheduler()` | 多个模块都需要固定节奏刷新时，避免重复造轮子 | `src/utils/refreshScheduler.js` |
| 对齐分钟刻度刷新 | 不是“从现在起每隔 N 分钟”，而是“对齐到每个 N 分钟的某一秒” | 行情、资产走势等更适合按整点刻度更新 | `accounts`、`market`、`investment` store 都在用 |
| 页面隐藏时跳过任务 | 检查 `document.hidden` 决定是否执行刷新 | 避免后台标签页白白消耗请求 | `src/utils/refreshScheduler.js` |
| 布局层统一启动 / 停止自动刷新 | 在 `Home.vue` 里统一管理多个 store 的自动刷新 | 页面壳长期存在，适合作为全局调度入口 | `src/pages/Home.vue` |

---

## 6. 常见第三方库与项目中的真实用法

### 6.1 VueUse

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| `useDebounceFn` | 防抖执行函数 | 搜索输入联想，减少接口调用次数 | `useMarketPage.js`、`AddPositionCard.vue` |
| `useEventListener` | 自动绑定并清理事件监听 | 监听页面可见性变化、窗口事件 | `useMarketPage.js` |
| `onClickOutside` | 点击组件外部时关闭浮层 | 下拉框、弹窗、移动菜单 | `DatePicker.vue`、`Topbar.vue`、`TransactionsHistoryCard.vue` |
| `useResizeObserver` | 监听元素尺寸变化 | 文本溢出重算、图表容器变化 | `PositionCard.vue` |
| `useIntervalFn` | 更易控的定时器封装 | 倒计时验证码、轮询逻辑 | `useLoginPage.js` 中 `useCountdown()` |

### 6.2 Floating UI

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| `useFloating()` | 计算浮层相对触发元素的位置 | 选择器、日历弹层、菜单面板 | `AccountPicker.vue`、`DatePicker.vue` |
| `offset()` | 控制浮层与触发元素间距 | 下拉层不要贴太紧 | 同上 |
| `flip()` | 空间不够时自动翻转方向 | 靠近视口底部时浮层向上展开 | 同上 |
| `shift()` | 防止浮层超出屏幕边界 | 移动端或窄屏防溢出 | 同上 |
| `size()` | 同步浮层宽度或高度 | 下拉面板宽度跟触发按钮一致 | `AccountPicker.vue` |
| `autoUpdate` | 滚动 / resize 时自动重算位置 | 浮层挂在 `body` 后仍能跟随目标 | `AccountPicker.vue`、`DatePicker.vue` |

### 6.3 ECharts + vue-echarts

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| 按需注册 ECharts 模块 | `use([CanvasRenderer, LineChart, ...])` | 减少不必要的图表组件打包体积 | `TrendCard.vue`、`PositionCard.vue` |
| `VChart` 组件 | 在 Vue 模板里直接渲染 ECharts | 折线图、饼图等图表 UI | `TrendCard.vue`、`FundProportionCard.vue` |
| `computed` 生成 `option` | 根据状态动态重算图表配置 | 区间切换、主题切换、数据变化 | `TrendCard.vue`、`PositionCard.vue` |
| `sampling: "lttb"` | 大量点位时做采样 | 折线点位很多时提升渲染性能 | `TrendCard.vue`、`PositionCard.vue` |
| tooltip formatter | 自定义 tooltip HTML 内容 | 金额和时间展示要更友好 | `TrendCard.vue`、`PositionCard.vue` |

### 6.4 Element Plus

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| `app.use(ElementPlus, { locale })` | 全局安装 UI 组件库并设置中文语言包 | 统一 Element Plus 行为和文本 | `src/main.js` |
| `ElMessage` | 成功 / 失败 / 警告消息提示 | 登录提示、删除成功、参数非法 | `src/utils/api.js`、`useLoginPage.js`、`useMarketPage.js` |
| 让 API 层统一提示 | 拦截器里直接弹错误消息，业务层少写重复逻辑 | 网络错误、401、服务端 message 返回 | `src/utils/api.js` |

### 6.5 Day.js

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| 日期解析与格式化 | `dayjs(v).format(...)` | 表格日期展示、默认时间文本 | `TransactionsHistoryCard.vue` |
| 插件扩展 | `dayjs.extend(customParseFormat)` | 自定义格式严格解析 | `src/components/ui/DatePicker.vue` |
| 日期比较 | `isAfter`、`isSame` | 禁止选未来日期、判断选中日期 | `DatePicker.vue` |

---

## 7. 浏览器原生能力与交互处理

这部分不是 Vue 专属，但在中大型前端项目里非常常见。

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| `document.hidden` | 判断页面当前是否处于后台 | 后台标签页不刷新、错误提示不刷屏 | `src/utils/api.js`、`src/utils/refreshScheduler.js`、`useMarketPage.js` |
| `visibilitychange` | 监听页面从后台回到前台 | 回到前台时补一次静默刷新 | `useMarketPage.js` |
| `document.addEventListener` / `removeEventListener` | 手动管理全局事件 | 点击外部关闭、键盘监听、原生 DOM 协作 | `AccountPicker.vue` |
| `CustomEvent` | 派发自定义浏览器事件 | 非父子关系组件之间进行轻量通信 | `PositionCard.vue` 用它协调多个交易面板只开一个 |
| `MutationObserver` | 监听 DOM 属性变化 | 观察根节点 class 变化，同步暗黑模式状态 | `PositionCard.vue` |

---

## 8. Tailwind CSS 与样式体系

### 8.1 Tailwind v4 使用方式

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| `@import "tailwindcss"` | 引入 Tailwind v4 | 全局启用工具类体系 | `src/styles/style.css` |
| `@config` | 在 CSS 中指定 Tailwind 配置文件 | Tailwind v4 下从样式文件直接接配置 | `src/styles/style.css` |
| `@layer base` | 写基础层样式 | 全局字体、选择高亮、root 变量、输入默认样式 | `src/styles/style.css` |
| `@layer components` | 抽取语义组件类 | `card-base`、`button-base`、`dropdown-panel` 等复用样式 | `src/styles/style.css` |
| `@apply` | 把多个 Tailwind 类组合成语义类 | 公共按钮、卡片、输入框，不想重复写原子类 | `card-base`、`button-base`、`input-base` |

### 8.2 主题与暗黑模式

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| CSS 变量 | 用 `--app-bg`、`--text-primary` 这类 token 描述主题 | 统一明暗主题和局部视觉风格 | `src/styles/style.css` |
| `@variant dark` | 自定义暗黑模式变体规则 | Tailwind 类里统一使用 `dark:*` | `src/styles/style.css` |
| `.dark` 根类切主题 | 给 `html` 或根节点加 `.dark` | 明暗模式切换 | `src/components/windows/SettingsModal.vue` + `src/styles/style.css` |
| 语义类 + 变量组合 | 类控制结构，变量控制颜色 | 让切主题时不用改很多模板 class | `.card-base`、`.dropdown-panel`、`.button-base` |

### 8.3 布局与响应式

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| Flex 布局 | 一维排布，控制对齐和伸缩 | 顶栏、按钮组、卡片头部 | `Home.vue`、`Topbar.vue`、`PositionCard.vue` |
| Grid 布局 | 二维排布，更适合卡片墙和表单 | 仪表盘、投资卡片墙、移动端筛选区 | `Dashboard.vue`、`Investment.vue`、`TransactionsHistoryCard.vue` |
| 响应式前缀 | `sm:`、`md:`、`xl:`、`2xl:` | 同一组件兼容手机和桌面 | 几乎所有页面和卡片组件 |
| `min-w-0` / `min-h-0` | 让 flex 子项正确收缩和滚动 | 复杂布局下防止内容把容器撑爆 | `Home.vue`、`Market.vue`、`Investment.vue` |
| `env(safe-area-inset-bottom)` | 适配带安全区的移动设备底部留白 | iPhone 等设备底部滚动区域更安全 | `Home.vue`、`Investment.vue` |

### 8.4 动画与视觉细节

| 知识点 | 用法 | 使用场景 | 项目例子 |
| --- | --- | --- | --- |
| 过渡类命名 | `xxx-enter-active` / `xxx-leave-to` | Vue `Transition` 识别动画类 | `Home.vue`、`PositionCard.vue`、`TransactionsHistoryCard.vue` |
| 浮层动画偏移变量 | 用 `--dropdown-offset` 控制上下展开方向 | 同一套下拉动画兼容向上 / 向下展开 | `src/styles/style.css` |
| 渐变背景和主题色变量 | 用 accent 色驱动卡片视觉 | 投资卡片更有识别度 | `PositionCard.vue` |
| `will-change` | 告诉浏览器提前优化动画属性 | 跑马灯、弹层动画更顺滑 | `PositionCard.vue`、`Home.vue` |

---

## 9. 本项目特别值得掌握的“模式”

下面这些不是单个 API，而是可以直接迁移到其它项目的工程模式。

### 9.1 页面不直接写请求，统一走 store

用法：

- 页面只负责展示和触发动作
- store 负责请求、数据归一化、错误处理、并发保护

使用场景：

- 页面越来越复杂，不希望接口逻辑散落在各组件里

项目例子：

- `Market.vue -> useMarketPage.js -> useMarketStore() -> src/utils/markets.js`
- `Investment.vue -> useInvestmentStore() -> src/utils/investment.js`

### 9.2 在边界层做数据归一化，不在模板里硬处理

用法：

- 后端数据一进 store / utils 就转成稳定结构
- 模板只消费“干净数据”

使用场景：

- 后端字段命名不统一，或者字段可能为空

项目例子：

- `normalizePosition()` in `src/stores/investment.js`
- `normalizeMarkets()` in `src/stores/market.js`
- `normalizeUsdPerCurrencyRates()` in `src/utils/fxRates.js`

### 9.3 用 Promise 缓存做“并发去重”

用法：

- 把当前请求 Promise 存起来
- 新调用进来时直接复用这个 Promise

使用场景：

- 多个组件同时依赖同一份数据

项目例子：

- `fetchPromise` in `src/stores/accounts.js`
- `fetchPromise` / `quotePromise` in `src/stores/investment.js`

### 9.4 用请求序号防止旧响应覆盖新状态

用法：

- 每发一次请求就 `++requestSeq`
- 返回时判断当前响应是不是最后一次请求

使用场景：

- 搜索框联想
- 多条件快速切换后的图表请求

项目例子：

- `searchRequestSeq` in `src/composables/useMarketPage.js`
- `trendRequestSeq` in `src/components/cards/investmentCards/PositionCard.vue`
- `requestSeq` in `src/components/cards/dashboardCards/TrendCard.vue`

### 9.5 用 layout 层统一管理全局副作用

用法：

- 在布局壳组件里统一启动和停止自动刷新

使用场景：

- 多个业务模块都要随着页面存在而定时更新

项目例子：

- `src/pages/Home.vue` 中统一调用 `startAccountsAutoRefresh()`、`startInvestmentAutoRefresh()`、`startMarketAutoRefresh()`

### 9.6 用 shared composable 做跨组件共享的派生数据

用法：

- 把共享 `ref` 放到 composable 顶层，而不是函数内部

使用场景：

- 多个组件都要消费同一份派生数据，但又不值得单独建一个 store

项目例子：

- `src/composables/useDashboardWorth.js`

---

## 10. 建议你优先掌握的学习顺序

如果你想“先掌握最有价值的 10 个点”，建议顺序如下：

1. `ref / reactive / computed`
2. `watch / onMounted / onUnmounted`
3. `defineProps / defineEmits / defineModel`
4. `storeToRefs + Pinia setup store`
5. `axios` 单例和拦截器
6. 数据归一化和防御式取值
7. Promise 并发与并发保护
8. composable 拆逻辑
9. `Transition / Teleport / Floating UI`
10. Tailwind 语义类体系

---

## 11. 对照文档索引

建议配合以下文档一起看：

- `docs/frontend-overview.md`
- `docs/dashboard-implementation.md`
- `docs/bookkeeping-implementation.md`
- `docs/market-implementation.md`
- `docs/investment-implementation.md`

建议读法：

1. 先看 `frontend-overview.md` 建立整体心智模型
2. 再看业务实现文档，理解每个模块怎么跑
3. 最后回到本 `learn.md`，按“知识点 -> 场景 -> 项目例子”反查源码

---

## 12. 你接下来最值得亲手练的 8 个练习

1. 自己手写一个带 `v-model` 的下拉选择器，对照 `SmallAccountPicker.vue`
2. 自己实现一个 Promise 缓存版 `fetchList()`，对照 `accounts.js`
3. 给一个搜索框加 `useDebounceFn` 和请求序号保护，对照 `useMarketPage.js`
4. 把一个大页面的交互逻辑抽到 composable，对照 `useBookkeepingPage.js`
5. 写一个 `axios` 拦截器统一错误提示，对照 `src/utils/api.js`
6. 用 `ECharts + computed option` 做一张折线图，对照 `TrendCard.vue`
7. 用 `Floating UI + Teleport` 做一个不会被遮挡的浮层，对照 `DatePicker.vue`
8. 用 `@layer components + @apply` 抽一组语义化按钮和卡片样式，对照 `src/styles/style.css`
