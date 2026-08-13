# 安装

插件本身跨桌面平台，但 Obsidian 或 Git 安装不当会导致插件不可用。

## 安装插件

### 从 Obsidian 内安装（BRAT 或社区市场）

1. 开发阶段可通过 BRAT 插件直接安装本仓库。
2. 正式版发布后：设置 → 第三方插件 → 浏览，搜索「Obsidian Git（中文版）」安装并启用。

### 手动安装

1. 下载发布包并解压到 `<vault>/.obsidian/plugins/obsidian-git-cn`。
2. 重启 Obsidian。
3. 在设置中关闭受限模式并启用插件。

## Windows

只安装 GitHub Desktop **不够**，需要安装完整 Git。

-   从[官网](https://git-scm.com/download/win)安装 Git 2.29+，全部使用默认选项。
-   启用 Git Credential Manager：在 Vault 所在目录执行 `git config credential.helper`，输出应为 `manager`；否则执行 `git config --global credential.helper manager`。

## macOS

-   按 [Git 官方文档](https://git-scm.com/install/mac) 安装 Git。
-   用系统钥匙串保存凭据：`git config --global credential.helper osxkeychain`。

## Linux

-   Obsidian 推荐使用 AppImage 安装；Snap 会隔离 Git，Flatpak 不推荐。
-   凭据助手：`git config --global credential.helper libsecret`，详见[认证说明](../Authentication.zh.md)。
