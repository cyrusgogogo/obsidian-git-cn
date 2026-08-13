# 认证说明（凭据助手）

插件**不保存任何密码或令牌**。所有认证都交给 Git 自身的凭据助手（credential helper）处理：你在终端里完成一次认证后，插件就能在 Obsidian 内直接拉取 / 推送。

推荐使用 HTTPS + 个人访问令牌（PAT）：

-   GitHub：Settings → Developer settings → Personal access tokens，生成后把令牌当作密码使用。
-   Gitee：设置 → 私人令牌，生成后同样当作密码使用。

## Windows

确认使用 Git 2.29+ 与 Git Credential Manager。在 Vault 所在目录执行：

```bash
git config credential.helper
```

输出应为 `manager`。如果不是，执行：

```bash
git config --global credential.helper manager
```

之后在终端执行一次 push / pull / clone，弹出窗口登录一次即可；此后 Obsidian 内无需再次输入。

## macOS

使用系统钥匙串保存凭据：

```bash
git config --global credential.helper osxkeychain
```

设置后在终端执行一次认证操作（clone / pull / push），之后即可在 Obsidian 内正常使用。

## Linux

使用 `libsecret` 把凭据保存在系统钥匙环（GNOME Keyring / KDE Wallet）：

```bash
git config --global credential.helper libsecret
```

若提示 `git: 'credential-libsecret' is not a git command`，需先安装 libsecret（以 Ubuntu 为例）：

```bash
sudo apt install libsecret-1-0 libsecret-1-dev make gcc
sudo make --directory=/usr/share/doc/git/contrib/credential/libsecret
git config --global credential.helper \
  /usr/share/doc/git/contrib/credential/libsecret/git-credential-libsecret
```

## SSH（二期支持）

SSH 认证依赖系统的 `ssh-agent` 与密钥配置，暂不在本插件 v1.0 范围内；HTTPS + PAT 即可覆盖 GitHub 与 Gitee 的日常使用。更多凭据助手选项见 [git-scm 文档](https://git-scm.com/doc/credential-helpers)。
