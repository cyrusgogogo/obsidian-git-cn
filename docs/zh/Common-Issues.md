# 常见问题与故障排查

## 找不到 Git 可执行文件 / 无法运行 git 命令

插件从 PATH 中查找 Git。确认已按[安装](Installation.md)文档装好 Git；若仍失败：

-   在设置「仓库与远端 → 自定义 Git 可执行文件路径」里填写 Git 路径。
-   Windows 终端执行 `where git`；Linux/macOS 执行 `which git`。无输出说明 Git 未正确安装。

## 无限拉取/推送且没有报错

通常是认证问题，参见[认证说明](../Authentication.zh.md)。

## `.gitignore` 中的文件仍被提交

已提交（或已暂存）过的文件不会因为修改 `.gitignore` 而被忽略：

1. 终端执行 `git rm --cached <file>`（文件仍保留在磁盘上）。
2. 提交这次删除。
3. 之后该文件的改动才会被正确忽略。

## macOS 报 `xcrun: error: invalid developer path`

终端执行 `xcode-select --install` 即可修复。

## 无法运行 gpg / 无法签名提交

通常是 GPG 未安装或未配置，与 Git 提交签名有关；在终端确认 `gpg` 可用。

## 提示仓库配置了 Git LFS 但找不到 git-lfs

需要单独安装 [Git LFS](https://git-lfs.com/)。

## 冲突了怎么办

1. 状态栏会显示「有冲突」，自动同步已暂停。
2. 执行「打开冲突文件」查看冲突清单；用「源码模式」编辑冲突文件，保留想要的内容并删除 `<<<<<<<` / `=======` / `>>>>>>>` 标记。
3. 解决后执行「同步」提交。
4. 想放弃这次合并：执行「中止冲突中的同步」，回到同步前状态；同步前的保护性提交仍在历史中，可随时回滚。
