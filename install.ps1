# Obsidian Git CN 安装脚本（Windows）
# 用法：powershell -ExecutionPolicy Bypass -File .\install.ps1 -VaultPath "D:\你的笔记库"
param(
    [Parameter(Mandatory = $true)]
    [string]$VaultPath
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "未找到 Node.js，请先安装 Node ≥24"
}
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    throw "未找到 pnpm，请先安装 pnpm ≥11"
}

Write-Host "安装依赖..."
pnpm install
Write-Host "编译插件..."
pnpm run build

$PluginDir = Join-Path $VaultPath ".obsidian\plugins\obsidian-git-cn"
New-Item -ItemType Directory -Force -Path $PluginDir | Out-Null
Copy-Item `
    -LiteralPath (Join-Path $RepoRoot "main.js"), (Join-Path $RepoRoot "manifest.json"), (Join-Path $RepoRoot "styles.css") `
    -Destination $PluginDir `
    -Force

Write-Host "已安装到：$PluginDir"
Write-Host "请重启 Obsidian，并在「设置 → 第三方插件」中启用「Obsidian Git（中文版）」。"
