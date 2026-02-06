# AGENTS.md
本文件为在此仓库中工作的自动化编码代理（agent）提供统一约束与执行规范。

## 1) 项目概览
- 技术栈：Vue 3 + Vite + Pinia + Vue Router + Element Plus + Tailwind CSS v4。
- 包管理器：npm（锁文件为 `package-lock.json`）。
- 模块体系：ESM（`"type": "module"`）。
- Node 要求：`^20.19.0 || >=22.12.0`。
- 开发服务地址：`http://127.0.0.1:3000`。
- 开发期 API 代理：`/api -> http://127.0.0.1:8000`。
- 路径别名：`@` 映射到 `src`。

## 2) 关键事实来源文件（Source of Truth）
- `package.json`：脚本、依赖、Node 版本约束。
- `vite.config.js`：插件、别名、代理、开发服务器配置。
- `jsconfig.json`：JS 路径映射。
- `tailwind.config.js`：Tailwind 主题与插件。
- `src/main.js`：应用启动入口。
- `src/router/index.js`：路由定义。
- `src/utils/api.js`：Axios 实例与拦截器。
- `src/stores/*.js`：Pinia 状态与业务逻辑。

## 3) 安装 / 运行 / 构建命令
请在仓库根目录执行：`C:\Users\13647\Desktop\WRY\Code\My_Project\vue-project`

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run preview
```

当前脚本现状：
- 未定义 `lint` 脚本。
- 未定义 `test` 脚本。

## 4) Lint / Test 现状（当前仓库真实状态）
- 未发现 ESLint 配置（`.eslintrc*` / `eslint.config.*`）。
- 未发现 Prettier 配置。
- 未发现测试运行器配置（如 `vitest.config.*`、`jest.config.*` 等）。
- 未发现已提交测试文件（`*.spec.*`、`*.test.*`）。

代理执行规则：
- 未实际执行时，不得声称“已运行 lint/test”。
- 对代码改动至少执行 `npm run build` 作为最小验证。

## 5) 单测（Single Test）执行指引
由于当前未配置测试框架，**现在没有可保证可用的“单测单文件命令”**。

若未来引入 Vitest，可使用：

```bash
npx vitest run path/to/file.spec.js
```

运行单个命名测试：

```bash
npx vitest run path/to/file.spec.js -t "test name"
```

若后续新增 `test` 脚本，优先使用：

```bash
npm run test -- path/to/file.spec.js -t "test name"
```

## 6) 代码风格与工程约定（观测 + 期望）

### 6.1 JS / Vue 模块风格
- 仅使用 ESM import/export。
- import 统一放在文件顶部。
- 内部模块优先使用别名导入（`@/...`）。
- 新增 Vue SFC 优先使用 `<script setup>`。
- 组件文件使用 PascalCase（例：`AccountPicker.vue`）。
- Store 命名使用 `useXxxStore`，放在 `src/stores`。

### 6.2 格式化与最小改动原则
- 仓库现有格式并不完全统一（引号、分号、空格存在混用）。
- 修改时遵循“就地风格一致”，不要顺手全仓库格式化。
- 保持 diff 小而聚焦，仅改与任务相关内容。
- 保持当前文件内缩进风格一致。

### 6.3 import 排序建议
新增 import 时建议顺序：
1. 框架层（`vue`、`pinia`、`vue-router`）。
2. 第三方包（`axios`、`element-plus` 等）。
3. 别名路径（`@/...`）。
4. 相对路径。
5. 副作用导入（如样式）放最后。

### 6.4 命名规范
- 组件/组件文件：PascalCase。
- 变量/函数：camelCase。
- 常量：真正常量使用 UPPER_SNAKE_CASE，其余仍用 camelCase。
- Store action：使用动词语义（如 `fetchAccounts`、`createOne`、`resetFilters`）。
- 避免新建散落的 magic string，可复用文本应集中管理。

### 6.5 类型与数据结构处理
本仓库当前为 JavaScript 项目（无全局 TypeScript 体系）。

处理 API 数据时：
- 在 store/API 边界归一化响应（例如 `res?.data ?? res`）。
- 对可空字段做防御性空值判断。
- 尽量避免在模板层做复杂解析/归一化。
- 若引入 TypeScript，需渐进式推进，避免一次性无关迁移。

### 6.6 错误处理
- 异步 store action/写操作使用 `try/catch/finally`。
- 失败时维护好 store 内 `error` 状态。
- 调用方需要控制流时，store 内应 re-throw 错误。
- 用户可见错误沿用现有模式（`ElMessage`）。
- 认证失败遵循现有流程：尝试刷新 token，失败后跳转 `/login`。

### 6.7 Pinia 状态管理
- 数据获取与业务逻辑放在 store，不放在页面组件。
- 仅暴露 UI 所需状态，避免过度暴露。
- 为登出/切换账户等场景提供显式 reset 方法。
- 避免重复并发请求（仓库已有 promise 缓存模式可复用）。

### 6.8 API 层约定
- HTTP 请求封装在 `src/utils/*`，不要直接写在页面组件里。
- 复用 `src/utils/api.js` 的共享 `api` 实例，保持拦截器一致。
- 端点风格保持与现有一致（包括尾部斜杠习惯）。

### 6.9 Vue 组件实践
- 在 `<script setup>` 中使用 `defineProps` / `defineEmits`。
- 派生 UI 状态优先用 computed。
- 全局事件监听需在 `onUnmounted` 清理。
- 组件关注展示；编排和业务流程留在 store。

### 6.10 样式约定
- Tailwind 是主样式方案。
- 优先复用现有共享样式（`src/styles/style.css`、`src/styles/modal.css`）。
- 非必要不引入第二套并行样式体系。

## 7) 文件与改动卫生规则
- 不要手改 `dist/` 产物。
- 不要提交 `node_modules/`。
- 改动范围紧贴任务需求，避免“顺手重构”。
- 遇到历史混合风格文件，只改必要部分。

## 8) 完成前最小验证清单
对代码改动，至少执行：
1. `npm run build`
2. 检查改动文件是否有未解析 import
3. 复查改动流程是否存在明显功能回归

若你新增了 lint/test 工具，请额外运行对应命令并在结果中给出真实输出结论。

## 9) Cursor / Copilot 规则检查
已检查路径：
- `.cursorrules`
- `.cursor/rules/`
- `.github/copilot-instructions.md`

当前结果：
- 仓库中未发现 Cursor 或 Copilot 专用规则文件。

若后续新增上述文件，应将其视为更高优先级且必须遵守的仓库规则。
