# Obsidian Git（中文版）

面向中文用户的 Obsidian Git 插件：以 [obsidian-git](https://github.com/Vinzent03/obsidian-git)（MIT 许可）为上游的分叉，界面与文档完整中文化，提供开箱即用的 Git 备份与多设备同步。仅支持桌面端（Windows / macOS / Linux）。

## 功能

-   **自动提交与推送**：停止编辑 5 分钟后自动提交，默认提交后自动推送；另支持手动触发与定时执行。
-   **自动拉取**：启动 Obsidian 时自动拉取（默认开启），也可按设定间隔定时拉取。
-   **远端变更检测**：状态栏常驻显示领先 / 落后与未推送提交数，检测到分叉或落后时给出中文通知。
-   **自动合并与保护**：支持 merge（默认）/ rebase / reset 三种拉取策略；拉取前自动生成保护性提交，失败可完整回滚；冲突时暂停同步并给出中文提示。
-   **中文界面与文档**：默认中文、可切换英文，设置面板、命令、通知、帮助文档全部中文化。
-   **国内网络环境优化**：支持任意标准 Git URL，重点适配 GitHub 与 Gitee；认证走 HTTPS + 个人令牌，由系统 Git 凭据助手保管，插件不保存任何密码，也不影响 git 自身的 `http.proxy` 配置。

## 安装

### 方式一：安装脚本（推荐）

克隆本仓库后，在仓库根目录执行：

Windows（PowerShell）：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -VaultPath "D:\你的笔记库"
```

macOS / Linux：

```bash
bash install.sh "/path/to/your/vault"
```

脚本会自动安装依赖、编译并把插件复制到你的笔记库。重启 Obsidian 后，在「设置 → 第三方插件」中启用「Obsidian Git（中文版）」。

### 方式二：手动构建安装

1. 环境要求：Node ≥24、pnpm ≥11（Windows 可参考 [nvm-windows](https://github.com/coreybutler/nvm-windows)，国内网络可用 [npmmirror](https://npmmirror.com/mirrors/node/)）。
2. 编译：

```bash
pnpm install
pnpm run build
```

3. 把 `main.js`、`manifest.json`、`styles.css` 复制到 `<vault>/.obsidian/plugins/obsidian-git-cn/`。
4. 重启 Obsidian 并启用插件。

### 首次配置

1. 命令面板执行「初始化新仓库」或「克隆现有远端仓库」。
2. 执行「编辑远端」绑定你的仓库 URL。
3. 在终端对该仓库执行一次 `git push` / `git pull`，让系统凭据助手记录你的个人令牌（插件不保存密码）。

## 文档

-   [使用教程](docs/zh/Getting-Started.md)
-   [认证说明（凭据助手）](docs/Authentication.zh.md)
-   [常见问题与故障排查](docs/zh/Common-Issues.md)
-   [帮助文档索引](docs/zh/Start-Here.md)

## 参与开发

-   术语表：[CONTEXT.md](CONTEXT.md)
-   架构决策记录：[docs/adr/](docs/adr/)
-   上游跟进：[docs/upstream.md](docs/upstream.md)

开发命令：

-   `pnpm run dev`（开发构建，监听文件变化）
-   `pnpm run build`（生产构建，输出 `main.js`）
-   `pnpm run test`（单元测试）
-   `pnpm run all`（tsc + svelte-check + format + lint + test）

## 许可证

MIT，与上游 obsidian-git 保持一致。
