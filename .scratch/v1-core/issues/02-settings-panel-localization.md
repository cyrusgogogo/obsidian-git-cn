Status: ready-for-agent
Type: task

# 设置面板按 FR-13 分类并中文化

现有 `src/setting/settings.ts` 沿用上游英文设置项。按 spec FR-13 重组为五类：仓库与远端、同步触发、拉取策略、提交、通知，并接入 i18n。

## 验收标准

- 设置面板分为上述五类，文案全部中文；
- 默认值与 spec 一致：启动时拉取开、提交后推送开、定时同步关（开启后默认 30 分钟）、防抖提交 5 分钟、拉取策略 merge；
- `pnpm run tsc && pnpm run svelte` 通过。
