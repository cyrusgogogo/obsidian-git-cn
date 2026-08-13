# 上游跟进

- 上游仓库：<https://github.com/Vinzent03/obsidian-git>（MIT 许可）
- 导入基线：commit `4011f9a21e26cb08bd2dd68899c8a5d4d0111e70`（上游 v2.39.0），导入于 2026-08-13；本 fork 采用自有版本线（ADR-0004），首个正式版 1.0.0 以该版本为基线
- 跟进策略（ADR-0001）：每个上游 release 跟进一次，用 merge 保持历史；定制改动隔离在独立文件与提交中

## 定制改动隔离原则

- 中文文案集中到 `src/i18n.ts` 与后续翻译文件，源码保留英文 key；
- `manifest.json` / `package.json` 中 fork 专属字段（id、名称、描述）单独维护；
- 尽量少改上游文件的无关行，降低每次 merge 的冲突面。

## 跟进命令

```bash
git fetch upstream
git merge upstream/master
```

冲突处理：本仓库文档（README、AGENTS、docs/）与上游同名文档冲突时保留本仓库版本；源码冲突逐文件解决，优先把定制改动继续隔离。

## 已知问题

- 上游 `tests/editor/signs/patchRoundTrip.test.ts` 的 8 个用例在 Windows 上因 CRLF 换行（期望 `\n`、实际 `\r\n`）失败；上游 CI 为 Linux，属环境差异而非本 fork 引入。在启用 Windows CI 前需修复测试的换行处理。
