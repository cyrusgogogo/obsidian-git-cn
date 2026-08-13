# 12 — GitHub 与 Gitee 全流程验证

**What to build:** 在 GitHub 与 Gitee 两个平台用 HTTPS + 个人令牌完成「初始化 → 提交 → 推送 → 拉取」的全流程验证，并确认插件不破坏 git 自身的 http.proxy 配置。

**Blocked by:** 05 — 四种触发与自动同步默认行为

**Status:** ready-for-agent

- [ ] GitHub HTTPS PAT：初始化 → 提交 → 推送 → 拉取全流程通过
- [ ] Gitee HTTPS PAT：同流程通过
- [ ] git 自身 http.proxy 配置不被插件破坏（回归验证）
- [ ] 验证清单记录进仓库文档
