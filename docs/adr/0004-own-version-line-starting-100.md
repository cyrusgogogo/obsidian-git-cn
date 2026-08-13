# 采用独立版本线，首版从 1.0.0 起

本项目是 obsidian-git 的分叉，但以独立插件身份（`id: obsidian-git-cn`）对外发布。沿用上游版本号（当前 2.39.0）会让用户与发布工具无法区分「上游发布」与「本 fork 的汉化/适配发布」，因此采用自有版本线：首个正式发布为 1.0.0，上游版本仅作为跟进基线记录在 `docs/upstream.md`。

## Considered Options

- **沿用上游版本号（2.40.0）**：跟进时无需换算版本，但发布节奏被上游绑架，且同名版本号指向两个不同产物，易误装、易误报。
- **自有版本线（选定）**：从 1.0.0 起独立编号，发布内容、changelog、`minAppVersion` 均由本仓库独立管理。

## Consequences

- `manifest.json` / `package.json` 的版本不再跟随上游；每次跟进上游 release 时，在 `docs/upstream.md` 记录对应基线版本。
- 本插件与上游是不同插件（`id` 不同），不共享更新路径，用户需显式安装本 fork。
