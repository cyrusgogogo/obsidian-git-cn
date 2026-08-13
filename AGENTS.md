# AGENTS.md

## 项目概览

- 本仓库目标是**中文版 Obsidian Git 插件**：自动 commit / push / pull、远端变更检测、自动 merge 与冲突提示，面向中文用户，界面与文档完整中文化。
- 上游（fork 来源）：[obsidian-git](https://github.com/Vinzent03/obsidian-git)（MIT 许可）。
- **当前状态：v0.1 进行中。** 已导入上游基线源码（v2.39.0，基线见 `docs/upstream.md`），i18n 模块已搭骨架；全部用户可见文案的迁移见 `.scratch/v1-core/issues/01-*.md`。

## 功能硬性要求

- 自动同步必须具备：手动触发、定时执行、启动时拉取、提交后自动推送四种触发方式，且均可独立开关。
- 拉取策略可配置（merge 默认 / rebase / reset），stash 仅作拉取前暂存未提交改动的保护机制；合并前必须能够恢复现场：冲突或失败时不得丢弃用户任何本地修改。
- 面向用户的文案一律使用中文；翻译键使用英文作为 key，不要以中文直接作为 key。

## 数据安全边界

- **禁止** force push、删除远端分支、静默丢弃工作区修改。
- 任何可能覆盖本地内容的操作（pull / merge / rebase / stash pop）之前，先备份或可完整回滚。
- 网络、认证相关配置（Token、密码）不得写入日志、通知或提交历史。

## 开发约定

- 语言与工具：TypeScript + Obsidian API，包管理使用 pnpm（与上游一致，Node ≥24、pnpm ≥11），Git 操作基于 simple-git。
- 代码标识符用英文，注释与文档用中文。
- 面向用户的行为文案集中管理，禁止硬编码散落各处。
- 插件运行时产物（如 `.obsidian/`、构建出的 `main.js`）按发布流程处理，源码提交中保持干净。

## 常用命令

- 安装依赖：`pnpm install`
- 开发构建（监听）：`pnpm run dev`
- 生产构建：`pnpm run build`（输出 `main.js`，已 gitignore）
- 类型检查：`pnpm run tsc`；Svelte 检查：`pnpm run svelte`
- 测试：`pnpm run test`；单文件：`pnpm run test -- tests/i18n.test.ts`
- 静态检查：`pnpm run lint`；格式检查：`pnpm run format`
- 全量检查：`pnpm run all`
- 跟进上游：`git fetch upstream && git merge upstream/master`

## Code Review Rules

- 检查 Git 操作路径：任何一处静默覆盖、丢改、或未做回滚保护的合并逻辑都应标记。
- 检查中文化完整性：新增的用户可见文案必须有对应中文翻译，且以英文 key 引用。
- 检查敏感信息：Token、密码、私有仓库地址不得出现在日志输出或错误提示中。

## Agent skills

### Issue tracker

问题以 Markdown 文件形式存放在本仓库的 `.scratch/<feature>/` 下。见 `docs/agents/issue-tracker.md`。

### Triage labels

五个标准 triage 角色直接使用同名标签字符串。见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文布局：仓库根目录一个 `CONTEXT.md` + `docs/adr/`。见 `docs/agents/domain.md`。
