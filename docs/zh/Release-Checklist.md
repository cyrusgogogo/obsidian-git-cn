# 发布前审计清单

发布到 BRAT 或社区插件市场前逐项确认。

## BRAT 分发

-   [x] 仓库根目录有 `manifest.json`（`pnpm run build` 后生成 `main.js`，两者齐备即可被 BRAT 拉取）
-   [x] `manifest.json` 的 `id` 为 `obsidian-git-cn`（不可再改，否则丢失用户配置）
-   [x] `manifest.json` 的 `isDesktopOnly` 为 `true`
-   [ ] 正式打 tag 并生成 `versions.json`（首版可仅凭 `manifest.json` 安装，多版本发布时补充）

## 元数据

-   [x] `author` 指向本 fork 维护者（xr）
-   [x] `authorUrl` / `repository` 指向本 fork 仓库
-   [x] 已移除上游作者的赞助链接

## 安全

-   [x] 无 `--force` 推送：全库检索无强制推送调用；删除未合并本地分支前有确认弹窗
-   [x] 无凭据落盘：桌面端不保存任何密码/令牌，认证交给系统凭据助手；仅移动端（isomorphic-git，不在 v1.0 范围）路径涉及旧字段迁移
-   [x] 错误通知与日志经 `redactCredentials` 脱敏，URL 中的 `user:token@` 会被移除

## 中文化

-   [x] 设置面板、命令面板、通知、状态栏、弹窗与视图文案全部经 i18n 渲染，默认中文、可切英文
-   [x] 帮助文档（安装、开始使用、认证、常见问题）已中文化，术语与 `CONTEXT.md` 一致

## 质量门

-   [x] `pnpm run tsc` 通过
-   [x] `pnpm run svelte`（svelte-check）通过
-   [x] `pnpm run lint` 与 `pnpm run format` 通过
-   [x] 单测通过；全量测试仅剩上游 8 个 Windows CRLF 已知失败（见 `docs/upstream.md`）
