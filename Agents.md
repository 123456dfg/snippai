# Snippai 开发规范（Agent）

本文档基于当前仓库 `develop` 分支代码与配置生成，适用于本项目后续功能开发、重构与修复。

## 1. 适用范围与目标

- 适用分支：`develop`（当前默认开发分支）。
- 适用目录：`src/`、`docs/` 及根目录构建配置。
- 目标：在不破坏现有行为的前提下，持续提升可维护性、类型安全与发布稳定性。

## 2. 技术栈与常用命令

- 核心栈：`Electron Forge` + `Vite` + `React 18` + `TypeScript` + `TailwindCSS` + `shadcn/ui`（Radix）。
- 文档栈：`VitePress`（`docs/`）。
- 质量工具：`ESLint`（已配置），`Husky`（已接入，当前 `pre-commit` 为空）。

开发命令（以 `package.json` 为准）：

- `npm run start`：Electron 本地启动。
- `npm run start:web`：仅前端（Vite）启动。
- `npm run lint`：全仓 ESLint 检查（`.ts/.tsx`）。
- `npm run package` / `npm run make`：桌面包构建。
- `npm run docs:dev` / `npm run docs:build`：文档开发与构建。

## 3. 目录职责（强制遵守）

- `src/main.ts`：Electron 主进程（窗口生命周期、全局快捷键、截图能力、IPC 发送）。
- `src/preload.ts`：`contextBridge` 暴露白名单 API（渲染层与 Electron 能力桥接）。
- `src/renderer/`：React 渲染进程（UI、状态、模型调用、组件）。
- `src/renderer/models/`：模型适配层（按 `model-*.ts` 文件组织）。
- `src/renderer/components/ui/`：基础 UI 原子组件（shadcn 风格）。
- `docs/`：VitePress 文档站点。

禁止跨层直接调用：

- 渲染层禁止直接依赖 `electron` 主进程 API。
- 主进程能力必须通过 `preload` 显式暴露后再给渲染层使用。

## 4. Electron 与安全规范（强制）

- 保持 `contextBridge` 白名单模式，不新增“全量透传”接口。
- 不在渲染进程开启 `nodeIntegration`。
- IPC 通道命名应语义化，新增通道时同步更新 `preload` 暴露方法与清理逻辑。
- 截图、API Key 等敏感信息禁止打印到控制台或上报到错误平台。
- 网络请求必须使用 `https`，禁止硬编码私密密钥。

## 5. TypeScript 与代码风格

### 5.1 类型规范（强制）

- 新增代码禁止无必要 `any`；`tsconfig` 已启用 `noImplicitAny`。
- 若必须兼容历史逻辑使用 `any`，需在附近添加简短注释说明原因与后续替换计划。
- 公共函数、组件 props、模型入参/出参必须写明确类型。

### 5.2 命名与文件组织（推荐 + 渐进约束）

- 现有业务组件文件以 `lowerCamelCase` 为主（如 `displayTextResult.tsx`），短期内保持兼容，不做大规模重命名。
- 新增组件建议：
  - 文件名沿用当前目录约定（业务组件可 `lowerCamelCase`）。
  - 组件名使用 `PascalCase`。
- 模型文件统一：`src/renderer/models/model-<name>.ts`。
- 常量使用语义化命名，避免魔法字符串散落（如本地存储 key、IPC channel）。

### 5.3 导入与依赖（推荐）

- 导入顺序：第三方依赖 -> 项目内模块。
- 优先使用别名 `@/`（已在 Vite/TS 配置中声明），减少深层相对路径。
- `components/ui` 仅放通用基础组件，业务逻辑放 `components/`。

### 5.4 注释与日志（强制）

- 注释仅用于说明“为什么”，避免解释显而易见的“做了什么”。
- 提交前移除调试日志（`console.log`）；保留日志需说明用途（如关键错误上下文）。
- 文件编码统一 UTF-8，避免出现乱码注释。

## 6. UI 与交互规范

- 优先复用 `components/ui` 原子组件与 `cn()` 工具函数，保持视觉与交互一致。
- 样式优先 Tailwind utility class，公共主题变量沿用 `src/renderer/index.css` 的 CSS 变量体系。
- 新增可交互按钮/表单必须包含可识别文案或可访问性属性（如 `aria-*`/可见标签）。
- 涉及用户反馈的异步行为需提供加载态与错误提示（项目中统一使用 toast）。

## 7. 模型接入规范

新增模型时必须同时修改：

1. `src/renderer/models/model-<name>.ts`：实现模型调用函数。
2. `src/renderer/lib/models.ts`：补充模型元数据（`value/label/requireApiKey/requireBaseURL/modelScript`）与提示词选项。
3. `src/renderer/models/index.ts`：确保动态加载路径可命中该模型文件。
4. UI 交互：验证模型切换、API Key 输入与重试逻辑可用。

要求：

- 统一错误抛出格式，保证 UI toast 能展示有效信息。
- 不在日志中输出完整请求体中的敏感字段（例如 API Key）。

## 8. 本地存储与配置规范

- 当前已使用的 key（如 `model`、`apiKeyMap`、`${model}_baseURL`）不得随意改名；若需变更必须提供迁移逻辑。
- 新增本地存储键名应集中定义并加前缀，避免冲突。
- 读取本地存储时必须处理空值、非法 JSON、版本兼容问题。

## 9. 提交与分支规范

- 分支建议：`feat/*`、`fix/*`、`chore/*`、`docs/*`。
- Commit message 建议采用：`type(scope): summary`（与历史 `chore:`/`fix:` 提交风格兼容）。
- PR 至少包含：
  - 变更目的与范围；
  - 手动验证步骤与结果；
  - 涉及 UI 时附截图或录屏。

## 10. 合入前检查清单（强制）

- 已执行：`npm run lint` 且通过。
- 修改文档站相关内容时已执行：`npm run docs:build` 且通过。
- 至少完成一次核心流程手测：
  - 截图触发与结果回传；
  - 模型切换与提示词切换；
  - API Key 输入/保存；
  - 结果展示与复制。
- 未引入无关文件改动（尤其构建产物与临时文件）。

## 11. CI/CD 对齐要求

- 当前 GitHub Actions 工作流会在 `develop` 分支 push/PR 时执行文档构建与部署（Azure Static Web Apps）。
- 涉及 `docs/`、导航、示例内容的改动，必须保证 `docs:build` 可通过，避免阻塞 CI。

---

若后续引入测试框架（如单元测试/E2E），应在本规范新增“测试分层与覆盖率要求”章节，并将其加入合入前强制检查项。
