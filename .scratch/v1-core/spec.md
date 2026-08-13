Status: ready-for-agent

# v1-core：中文版 Obsidian Git 插件核心同步能力

术语以 [CONTEXT.md](../../CONTEXT.md) 为准，架构决策见 [docs/adr/](../../docs/adr/)，上游基线与跟进方式见 [docs/upstream.md](../../docs/upstream.md)。

## Problem Statement

中文用户用 Obsidian 记笔记时，依赖英文界面的 obsidian-git 做备份与多设备同步：界面与文档存在语言门槛，默认行为也不是为「随手备份」调校的，国内常用平台（如 Gitee）与网络环境缺乏验证。用户需要一个默认中文、开箱即用、安全可回滚的自动同步插件。

## Solution

以 obsidian-git（MIT）为上游的 fork（ADR-0001），仅面向桌面端、单 Vault = 单 Git 仓库（ADR-0002），提供四种可独立开关的触发方式、merge/rebase/reset 三种拉取策略、拉取前的保护性提交与冲突提示，并通过英文 key + 默认中文的 i18n 层完整中文化（ADR-0003）。

## User Stories

1. As a 中文用户，I want 安装后界面默认显示中文，so that 我无需理解英文术语即可上手。
2. As a 用户，I want 快速初始化或关联 Vault 的 Git 仓库，so that 我可以立即开始备份。
3. As a 用户，I want 绑定任意标准远端 URL（GitHub、Gitee 或私有仓库），so that 我可以把笔记同步到自选平台。
4. As a 用户，I want 认证交给系统 Git 凭据助手而不是插件保存密码，so that 我的凭据不会随 Vault 落盘泄露。
5. As a 用户，I want 用一条命令手动触发同步，so that 我能掌控同步时机。
6. As a 用户，I want 启动 Obsidian 时自动拉取，so that 我一打开就是最新内容。
7. As a 用户，I want 本地提交后自动推送，so that 我的改动及时上云。
8. As a 用户，I want 按间隔定时同步且可关闭，so that 忘掉手动操作也有兜底保障。
9. As a 用户，I want 停止编辑 5 分钟后自动提交，so that 既不会频繁提交也不会长时间不保存。
10. As a 用户，I want 自定义提交信息模板，so that 提交历史可读、可辨认。
11. As a 用户，I want 在 merge / rebase / reset 之间选择拉取策略，so that 我能控制本地历史形态。
12. As a 用户，I want 拉取前自动生成保护性提交，so that 合并失败时我能完整回滚、不丢任何修改。
13. As a 用户，I want 冲突时收到中文通知和状态栏标记，so that 我知道有冲突需要处理。
14. As a 用户，I want 一键打开冲突文件，so that 我能快速着手解决冲突。
15. As a 用户，I want 状态栏常驻显示领先/落后与未推送数，so that 我随时能确认备份状态。
16. As a 用户，I want 检测到分叉或落后时收到中文通知，so that 我能及时同步。
17. As a 用户，I want 离线或推送失败时只提示、不反复重试，so that 省电且不产生噪音。
18. As a 用户，I want 错误信息不泄露 Token、密码或私有地址细节，so that 我的凭据与隐私安全。
19. As a 用户，I want 语言可在中文/英文间切换，so that 不同习惯的使用者都能使用。
20. As a 用户，I want 设置面板按「仓库与远端、同步触发、拉取策略、提交、通知」分类，so that 我能快速找到选项。
21. As a 多设备用户，I want 在设备 A 的修改能在设备 B 启动时自动获得，so that 我的笔记保持一致。
22. As a 用户，I want 未推送的提交不因重启丢失，so that 数据始终安全。
23. As a 用户，I want 插件不执行 force push、删除远端分支等破坏性操作，so that 我不担心误伤远端。
24. As a 用户，I want 通过 BRAT 安装预览版，so that 我能提前体验与反馈。
25. As a 用户，I want 中文帮助文档，so that 我能自助解决配置问题。
26. As a Gitee 用户，I want HTTPS + 个人令牌全流程可用，so that 我在国内网络环境下顺畅同步。
27. As a 用户，I want 插件不破坏 git 自身的 http.proxy 配置，so that 我走代理也能同步。
28. As a 用户，I want 看到同步过程状态（进行中/成功/失败），so that 我知道操作是否完成。

## Implementation Decisions

- 以分叉上游 obsidian-git 为实现基础，不重写（ADR-0001）；跟进上游时定制改动隔离在独立文件与提交中。
- 范围边界：仅桌面端（Windows/macOS/Linux）、单 Vault = 单 Git 仓库、四种触发（手动、定时、启动时拉取、提交后推送），不做移动端与子模块多仓库（ADR-0002）。
- i18n：源码保留英文 key，运行时默认渲染中文，设置中可切英文（ADR-0003）；文案集中管理，不散落硬编码。
- 触发默认值：启动时拉取开、提交后推送开、定时同步关（开启后默认每 30 分钟）。
- 自动提交用防抖模型：停止编辑默认 5 分钟后提交，间隔可配置、0 表示关闭；默认提交信息模板「同步：YYYY-MM-DD HH:mm」，可自定义。
- 拉取策略：merge（默认）/ rebase / reset 三选一；stash 仅作为「拉取前暂存未提交改动」的独立保护开关，不列为策略。
- 保护性提交：pull / merge / rebase 前若存在未提交改动先自动生成保护性提交，失败时留在历史中可完整回滚。
- 冲突处理：暂停自动同步、中文通知、状态栏标记、提供「打开冲突文件」命令；不自动解决、不静默覆盖。
- 远端变更检测：定时 fetch，状态栏常驻 ahead / behind 与未推送数；分叉或落后时中文通知。
- 离线与失败：push 失败仅通知、不自动重试，下次触发自然重试。
- 认证：任意标准 Git URL + HTTPS 个人令牌（PAT），凭据交给系统 Git 凭据助手，插件不保存密码；SSH 列入二期。
- 插件 id 定为 obsidian-git-cn；v0.x 走 BRAT/手动分发，v1.0 申请官方社区插件市场。
- 工具链：pnpm（Node ≥24、pnpm ≥11），Git 操作基于 simple-git。

## Testing Decisions

- 好测试的标准：只测外部可见行为（触发一次同步后发生了什么、状态栏显示什么、通知发什么），不断言内部实现细节（如调用了哪个 git 子命令）。
- 主接缝是 `GitManager` 抽象层：自动同步编排（四种触发、策略选择、保护性提交、冲突降级）用假 GitManager 实现来测；真实 Git 行为用临时仓库基建做集成测试，先例是 `tests/gitManager/simpleGit.test.ts`。
- i18n 纯函数单测翻译、缺失回退与参数替换，先例是 `tests/i18n.test.ts`。
- 设置默认值用纯数据断言与规格对照（启动拉取开、提交后推送开、定时关、防抖 5 分钟、策略 merge）。
- 冲突与回滚路径必须有集成测试，验证保护性提交可完整恢复现场。
- 已知环境问题：上游 patchRoundTrip 用例在 Windows 因 CRLF 失败（上游 CI 为 Linux），新增测试需注意换行处理。

## Out of Scope

- 移动端支持（上游实验性、依赖系统 git、不支持 SSH）。
- 子模块 / 多仓库管理。
- SSH 认证（二期）。
- 冲突的自动解决。
- 「离开时同步」触发（Obsidian 无可靠事件）。
- 自动重试与推送失败队列。
- 凭据存储（插件不保存任何密码）。
- 上游没有的新同步能力；本规格只做 fork 汉化、默认值调校与国内环境适配。

## Further Notes

- 决策记录：ADR-0001（fork 上游）、ADR-0002（范围边界）、ADR-0003（i18n 层）。
- 上游基线 commit `4011f9a`（v2.39.0），跟进命令见 docs/upstream.md。
- 本规格拆分为三张实现票据：01 全量 i18n 迁移、02 设置面板五分类中文化、03 发布前更新 fork 元数据。
- v1.0 验收：桌面端安装即用；四触发独立开关且默认值如上；自动提交、保护性提交、三种拉取策略可配置；冲突可提示并可完整回滚；GitHub 与 Gitee（HTTPS PAT）全流程验证通过；界面与文档完整中文化；无凭据落盘、无破坏性 Git 操作。
