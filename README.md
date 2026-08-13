# Obsidian Git CN（中文版）

面向中文用户的 Obsidian Git 插件：以 [obsidian-git](https://github.com/Vinzent03/obsidian-git)（MIT 许可）为上游的 fork，提供开箱即用、界面与文档完整中文化的 Git 同步与多设备备份体验。仅支持桌面端（Windows / macOS / Linux），移动端不在 v1.0 范围。

## 功能

-   **自动提交与推送**：停止编辑 5 分钟后自动提交（debounce，间隔可配置，0=关闭），默认提交后自动推送；另支持手动触发与定时执行。
-   **自动拉取**：启动 Obsidian 时自动拉取（默认开启），也可按设定间隔定时拉取。
-   **远端变更检测**：状态栏常驻显示 ahead / behind 与未推送提交数，定时 fetch，检测到分叉或落后时中文通知。
-   **自动合并与保护**：支持 merge（默认）/ rebase / reset 三种拉取策略；拉取前自动生成保护性提交，失败可完整回滚；冲突时暂停同步并中文提示。
-   **中文界面与文档**：轻量 i18n 模块，默认中文、可切换英文；设置面板、命令、通知与帮助文档完整中文化。
-   **国内网络环境优化**：支持任意标准 Git URL，重点验证 GitHub 与 Gitee；认证走 HTTPS + 个人令牌，交给系统 Git 凭据助手，插件不保存任何密码；不破坏 git 自身的 `http.proxy` 配置，SSH 认证列入二期。

## 项目状态

项目处于 **v0.1 开发阶段**：已导入上游基线源码（v2.39.0）。需求规格见 [.scratch/v1-core/spec.md](.scratch/v1-core/spec.md)，上游基线见 [docs/upstream.md](./docs/upstream.md)。

## 开发路线图

-   **v0.1**：导入上游基线代码，搭建构建 / 签名环境与 i18n 模块，确定 manifest（id `obsidian-git-cn`）
-   **v0.2**：核心 Git 操作封装（commit / pull / push，三种拉取策略与保护性提交）
-   **v0.3**：自动同步（手动、定时、启动时拉取、提交后推送四种触发）
-   **v0.4**：远端变更检测（状态栏）与冲突处理
-   **v1.0**：完整中文化、文档、社区市场发布

## 技术方向

-   TypeScript + Obsidian API
-   Git 操作基于 simple-git（与上游一致）

## 文档

-   需求规格：[.scratch/v1-core/spec.md](.scratch/v1-core/spec.md)
-   术语表：[CONTEXT.md](./CONTEXT.md)
-   架构决策记录：[docs/adr/](./docs/adr/)
-   帮助文档：[docs/zh/Start-Here.md](./docs/zh/Start-Here.md)
-   发布前审计清单：[docs/zh/Release-Checklist.md](./docs/zh/Release-Checklist.md)

## 本地开发

-   环境要求：Node ≥24、pnpm ≥11
-   `pnpm install`
-   `pnpm run dev`（开发构建，监听文件变化）
-   `pnpm run build`（生产构建，输出 `main.js`）
-   `pnpm run test`（单元测试）；`pnpm run all`（tsc + svelte-check + format + lint + test）

跟进上游：`git fetch upstream && git merge upstream/master`，详见 [docs/upstream.md](./docs/upstream.md)。

## 许可证

MIT，与上游 obsidian-git 保持一致。
