Status: ready-for-agent
Type: task

# 发布前更新 fork 元数据

`manifest.json` 的 id 已定为 `obsidian-git-cn`，`isDesktopOnly` 已改 true，上游的 fundingUrl 已移除。当前 author / authorUrl 仍指向上游，需在正式发布前更新为 fork 维护者与仓库地址。

## 验收标准

- `manifest.json` 与 `package.json` 的 author、仓库地址指向本 fork；
- 名称「Obsidian Git（中文版）」与中文描述保持；
- 与 LICENSE 中的上游版权声明（MIT）不冲突。
