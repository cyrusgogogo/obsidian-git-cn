# Obsidian Git CN

面向中文用户的 Obsidian Git 插件：在 fork 上游 obsidian-git 的基础上，把 Obsidian 笔记库（Vault）自动同步到 Git 远端，界面与文档完整中文化。

## Language

### 基础概念

**Vault（笔记库）**:
用户在 Obsidian 中打开的笔记根目录，本项目将其视为一个 Git 仓库的根。
_Avoid_: 仓库（与 Git 仓库歧义）、库（过于宽泛）

**远端（Remote）**:
Vault 对应的 Git 仓库所关联的远端仓库（GitHub、Gitee 或任意标准 Git URL）。
_Avoid_: 服务器、云端（不精确）

**分叉（Diverged）**:
本地与远端各自拥有对方没有的提交、无法快进合并的状态。
_Avoid_: 偏离（分叉是明确的技术状态）

**领先 / 落后（Ahead / Behind）**:
本地相对远端多出（ahead）/ 缺少（behind）的提交数量，状态栏常驻显示。

### 同步机制

**同步（Sync）**:
将本地 Vault 仓库与远端对齐的完整操作：提交未保存改动、拉取远端更新、合并、推送。
_Avoid_: 备份（只强调单向外存，不含拉取方向）

**触发方式（Trigger）**:
发起同步的四种机制：手动触发、定时执行、启动时拉取、提交后推送，四种均可独立开关。
_Avoid_: 自动同步（含糊，无法指认是哪一种触发）

**拉取策略（Sync Method）**:
拉取时如何整合远端提交：merge（默认）、rebase、reset，三种可配置。
_Avoid_: 合并策略（merge 只是其中一种）

**暂存（Stash）**:
把未提交改动临时移出工作区保存的保护机制，不属于拉取策略。
_Avoid_: 把 stash 当作一种拉取策略

**保护性提交（Protective Commit）**:
拉取前自动生成的本地提交，保证同步失败时能完整回滚，不丢弃任何本地修改。

**防抖提交（Debounced Commit）**:
停止编辑若干分钟（默认 5）后自动提交本地改动；间隔可配置，0 表示关闭。

**冲突（Conflict）**:
本地与远端对同一内容的不同修改无法自动合并的状态；此时暂停自动同步并提示用户。

### 发布与分发

**版本线（Version Line）**:
本插件独立于上游的版本序列，首个正式发布为 1.0.0；上游版本号仅用于跟进基线记录。
_Avoid_: 直接沿用上游版本号

**官方社区市场（Community Plugins）**:
Obsidian 官方插件目录，用户可在应用内检索安装；上架需向 obsidianmd/obsidian-releases 提交 PR 并通过审核。

**BRAT**:
第三方 Obsidian 插件分发工具，可直接从 GitHub 仓库安装或更新未上架插件，用于发布前试装与灰度验证。
