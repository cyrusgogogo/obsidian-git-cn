# 帮助文档

> 本插件仅支持桌面端（Windows / macOS / Linux），移动端不在 v1.0 范围。

## 目录

-   [安装](Installation.md)
-   [开始使用](Getting-Started.md)
-   [认证（凭据助手）](../Authentication.zh.md)
-   [常见问题与故障排查](Common-Issues.md)

## 什么是 Git

Git 是版本控制系统：它记录笔记的每次改动，允许回到历史版本，也支持与他人异步协作。Git 本身只管理本地仓库；配合远端仓库后，你可以把本地改动推送上去，作为备份或在多台设备之间同步。

## 术语与概念

本插件的术语以 [CONTEXT.md](../../CONTEXT.md) 为准，摘要如下：

-   **Vault（笔记库）**：Obsidian 打开的笔记根目录，本插件把它视为一个 Git 仓库。
-   **远端（Remote）**：Vault 对应 Git 仓库所关联的远端仓库（GitHub、Gitee 或任意标准 Git URL）。
-   **同步（Sync）**：把本地 Vault 仓库与远端对齐的完整操作：提交未保存改动、拉取远端更新、合并、推送。
-   **触发方式（Trigger）**：手动、定时、启动时拉取、提交后推送，四种可独立开关。
-   **拉取策略（Sync Method）**：merge（默认）/ rebase / reset。
-   **保护性提交（Protective Commit）**：拉取前自动生成的本地提交，失败时可完整回滚。
-   **防抖提交（Debounced Commit）**：停止编辑若干分钟（默认 5）后自动提交。
-   **冲突（Conflict）**：本地与远端对同一内容的不同修改无法自动合并的状态。

## 常见问题

遇到问题先看 [常见问题与故障排查](Common-Issues.md)。
