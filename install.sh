#!/usr/bin/env bash
# Obsidian Git CN 安装脚本（macOS / Linux）
# 用法：./install.sh "/path/to/your/vault"
set -euo pipefail

VAULT_PATH="${1:?用法: ./install.sh <VaultPath>}"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

command -v node >/dev/null || {
    echo "未找到 Node.js，请先安装 Node ≥24"
    exit 1
}
command -v pnpm >/dev/null || {
    echo "未找到 pnpm，请先安装 pnpm ≥11"
    exit 1
}

echo "安装依赖..."
pnpm install
echo "编译插件..."
pnpm run build

PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/obsidian-git-cn"
mkdir -p "$PLUGIN_DIR"
cp main.js manifest.json styles.css "$PLUGIN_DIR/"

echo "已安装到：$PLUGIN_DIR"
echo "请重启 Obsidian，并在「设置 → 第三方插件」中启用「Obsidian Git（中文版）」。"
