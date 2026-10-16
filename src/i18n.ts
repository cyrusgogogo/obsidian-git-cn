/**
 * 轻量 i18n 模块（见 ADR-0003）。
 *
 * 约定：
 * - 翻译键是英文原文，源码中保留英文 key；
 * - 默认语言为中文，英文语言包中 key 即显示文本；
 * - 所有用户可见文案应经 `t()` 渲染，禁止散落硬编码。
 */
export type Locale = "zh" | "en";

const zh: Record<string, string> = {
    // 通用
    Language: "语言",
    "Display language of the plugin interface.": "插件界面的显示语言。",
    "Obsidian Git": "Obsidian Git（中文版）",
    Sync: "同步",
    "{n} commits": "{n} 个提交",
    "Git is not ready. When all settings are correct you can configure commit-sync, etc.":
        "Git 未就绪。所有设置正确后即可配置提交与同步等选项。",
    commit: "提交",
    "commit-and-sync": "提交并同步",
    "commit and pull": "提交并拉取",
    "commit and push": "提交并推送",

    // 设置分类
    "Repository & Remote": "仓库与远端",
    "Sync Triggers": "同步触发",
    "Pull Strategy": "拉取策略",
    Commit: "提交",
    Notifications: "通知",
    Advanced: "高级",

    // 命令面板
    "Edit .gitignore": "编辑 .gitignore",
    "Open source control view": "打开源码控制视图",
    "Open history view": "打开历史视图",
    "Open diff view": "打开差异视图",
    "Open file on GitHub": "在 GitHub 打开文件",
    "Open file history on GitHub": "在 GitHub 打开文件历史",
    Pull: "拉取",
    Fetch: "抓取",
    "Switch to remote branch": "切换到远端分支",
    "Add file to .gitignore": "将文件加入 .gitignore",
    "Commit-and-sync": "同步",
    "Commit-and-sync and then close Obsidian": "同步并关闭 Obsidian",
    "Commit-and-sync with specific message": "同步并自定义提交信息",
    "Commit all changes": "提交全部改动",
    "Commit all changes with specific message": "提交全部改动并自定义信息",
    "Commit staged": "提交已暂存内容",
    "Amend staged": "修订已暂存内容",
    "Commit with specific message": "提交并自定义信息",
    "Commit staged with specific message": "提交已暂存内容并自定义信息",
    Push: "推送",
    "Stage current file": "暂存当前文件",
    "Unstage current file": "取消暂存当前文件",
    "Edit remotes": "编辑远端",
    "Remove remote": "移除远端",
    "Set upstream branch": "设置上游分支",
    "CAUTION: Delete repository": "警告：删除仓库",
    "Initialize a new repo": "初始化新仓库",
    "Clone an existing remote repo": "克隆现有远端仓库",
    "List changed files": "列出改动文件",
    "Switch branch": "切换分支",
    "Create new branch": "创建新分支",
    "Delete branch": "删除分支",
    "CAUTION: Discard all changes": "警告：丢弃全部改动",
    "Pause/Resume automatic routines": "暂停/恢复自动任务",
    "Raw command": "原生命令",
    "Toggle line author information": "切换行作者信息",
    "Reset hunk": "重置块",
    "Stage hunk": "暂存块",
    "Preview hunk": "预览块",
    "Go to next hunk": "下一个块",
    "Go to previous hunk": "上一个块",

    // 同步通知与提示
    "Not supported files will be opened by default app!":
        "不受支持的文件将用默认应用打开！",
    "Untracked | {path}": "未跟踪 | {path}",
    "Working Dir: {status} ": "工作区：{status} ",
    "Index: {status}": "索引：{status}",
    "Type your message and select optional the version with the added date.":
        "输入提交信息，可选择附带日期的版本。",
    'files in "{path}"': "「{path}」中的文件",
    Delete: "删除",
    Discard: "丢弃",
    "Are you sure you want to DELETE the {n} untracked file(s)? They are deleted according to your Obsidian trash setting.":
        "确定要删除 {n} 个未跟踪文件吗？将按 Obsidian 的回收站设置删除。",
    "Are you sure you want to discard ALL changes in {n} tracked file(s)?":
        "确定要丢弃 {n} 个受跟踪文件中的全部改动吗？",
    "{action} all {n} file(s)": "{action}全部 {n} 个文件",
    "Discard all {n} tracked file(s)": "丢弃全部 {n} 个受跟踪文件",
    Cancel: "取消",
    Save: "保存",
    "Local and remote have diverged ({ahead} ahead / {behind} behind)":
        "本地与远端已分叉（本地领先 {ahead} 个提交、落后 {behind} 个提交）",
    "Remote is ahead by {n} commit(s). Pull to get the latest changes.":
        "远端有 {n} 个新提交，建议拉取。",
    "Offline: ": "离线：",
    "Last Commit: {time}": "最近提交：{time}",
    "{n} unpushed commits": "{n} 个未推送提交",
    "Local {ahead} ahead / {behind} behind":
        "本地领先 {ahead} 个提交，落后 {behind} 个提交",
    "Git is offline": "Git 处于离线状态",
    "Git is ready": "Git 已就绪",
    "Git: Going into offline mode. Future network errors will no longer be displayed.":
        "Git：进入离线模式。后续网络错误将不再重复提示。",
    "It seems like you are not using GitHub": "看起来你使用的不是 GitHub",
    "Failed to get remote url of submodule": "无法获取子模块的远端 URL",
    "Remote branch is not configured": "未配置远端分支",
    "Failed to get current branch name": "无法获取当前分支名",
    "Failed to get remote url": "无法获取远端 URL",
    "Could not parse remote url": "无法解析远端 URL",
    "Aborted commit, because the following files are too big:\n- {files}\nPlease remove them or add to .gitignore.":
        "提交已中止，以下文件过大：\n- {files}\n请移除它们或加入 .gitignore。",
    "Running '{command}'...": "正在运行「{command}」…",
    "File not found: {file}": "找不到文件：{file}",
    "Open File": "打开文件",
    Stage: "暂存",
    Unstage: "取消暂存",
    "And {n} more files": "还有 {n} 个文件",
    "Stage all": "全部暂存",
    "Unstage all": "全部取消暂存",
    "Change Layout": "切换布局",
    Refresh: "刷新",
    Clear: "清空",
    "Unstage hunk": "取消暂存块",
    Copy: "复制",
    Paste: "粘贴",
    "Paste as plain text": "粘贴为纯文本",
    "Commit Message": "提交信息",
    "Git operation in progress...": "Git 操作进行中…",
    "Committing changes...": "正在提交改动…",
    "Pushing changes...": "正在推送改动…",
    "Pulling changes...": "正在拉取改动…",
    "Fetching from remote...": "正在从远端抓取…",
    "Checking out branch...": "正在检出分支…",
    "Failed on initialization!": "初始化失败！",
    Fetching: "正在抓取",
    Pulling: "正在拉取",
    Pushing: "正在推送",
    "Checking out": "正在检出",
    Cut: "剪切",
    "Select all": "全选",
    "Git: Stage": "Git：暂存",
    "Git: Unstage": "Git：取消暂存",
    "Git: Add to .gitignore": "Git：加入 .gitignore",
    "Open in default app": "用默认应用打开",
    "Show in system explorer": "在系统文件管理器中显示",
    "Copy commit hash": "复制提交哈希",
    "ObsidianGit: Base path does not exist": "ObsidianGit：基础路径不存在",
    "You have merge conflicts. Resolve them and commit afterwards.":
        "存在合并冲突。请解决后提交。",
    "# Conflicts": "# 冲突",
    "Please resolve them and commit them using the commands `Git: Commit all changes` followed by `Git: Push`":
        "请解决冲突，然后用「提交全部改动」命令提交，再执行「推送」",
    "(This file will automatically be deleted before commit)":
        "（此文件会在提交前自动删除）",
    "[[#Additional Instructions]] available below file list":
        "[[#补充说明]] 见文件列表下方",
    "- Not a file: {file}": "- 不是文件：{file}",
    "# Additional Instructions": "# 补充说明",
    'I strongly recommend to use "Source mode" for viewing the conflicted files. For simple conflicts, in each file listed above replace every occurrence of the following text blocks with the desired text.':
        "强烈建议用「源码模式」查看冲突文件。对于简单冲突，把上面列出的每个文件中以下文本块的每一次出现替换为期望内容。",
    "Open conflict file": "打开冲突文件",
    "Abort conflicted sync": "中止冲突中的同步",
    "No conflicts to abort": "没有需要中止的冲突",
    "No merge or rebase in progress": "当前没有进行中的合并或变基",
    "Aborted the conflicted sync. Your protective commit is still in history.":
        "已中止冲突中的同步。同步前的保护性提交仍在历史中，可随时回滚。",
    "Protective commit before sync": "同步前的保护性提交",
    "Pull failed ({method}): {error}": "拉取失败（{method}）：{error}",
    "Sync failed ({method}): {error}": "同步失败（{method}）：{error}",
    "No current branch found. Cannot pull.": "未找到当前分支，无法拉取。",
    "No tracking branch found. Ignoring pull of main repo and updating submodules only.":
        "未找到跟踪分支。忽略主仓库拉取，仅更新子模块。",
    "Pull: Everything is up-to-date": "拉取：已是最新",
    "You have conflicts in {n} file(s)": "你有 {n} 个文件存在冲突",
    "Cannot push. You have conflicts": "无法推送：存在冲突",
    "Cannot push. You have conflicts in {n} file(s)":
        "无法推送：你有 {n} 个文件存在冲突",
    "No commits to push": "没有需要推送的提交",
    "Pushed to remote": "已推送到远端",
    "Pushed {n} file(s) to remote": "已推送 {n} 个文件到远端",
    "Pulled {n} file(s) from remote": "已从远端拉取 {n} 个文件",
    "Fetched from remote": "已从远端抓取",
    "No changes to commit": "没有需要提交的改动",
    "Committed {n} file(s)": "已提交 {n} 个文件",
    "Committed approx. {n} file(s)": "已提交约 {n} 个文件",
    "Commit aborted: No commit message provided": "已中止提交：未提供提交信息",
    "Cannot run git command. Trying to run: '{cmd}' .":
        "无法运行 git 命令。尝试运行：{cmd}。",
    "Can't find a valid git repository. Please create one via the given command or clone an existing repo.":
        "找不到有效的 Git 仓库。请通过「初始化仓库」命令创建，或克隆一个现有仓库。",
    "No upstream branch is set. Please select one.":
        "尚未设置上游分支，请选择一个。",
    "Aborted. No upstream-branch is set!": "已中止：未设置上游分支！",
    "Set upstream branch to {branch}": "已将上游分支设为 {branch}",
    "Switched to {branch}": "已切换到 {branch}",
    "Created new branch {branch}": "已创建新分支 {branch}",
    "Deleted branch {branch}": "已删除分支 {branch}",
    "Fetching remote branches": "正在抓取远端分支",
    Aborted: "已中止",
    "Cannot find sh.exe at {path}. Please make sure Git is properly installed.":
        "在 {path} 找不到 sh.exe，请确认 Git 已正确安装。",
    "Stdout from commit message script is empty. Using default message.":
        "提交信息脚本输出为空，将使用默认提交信息。",
    "Automatic routines are currently paused.": "自动任务当前处于暂停状态。",
    "Auto backup: Please enter a custom commit message. Leave empty to abort":
        "自动备份：请输入自定义提交信息，留空则中止",
    "Too many changes to display": "改动过多，无法显示",
    "Do you really want to delete the repository (.git directory)? plugin action cannot be undone.":
        "确定要删除仓库（.git 目录）吗？此操作无法撤销。",
    "Successfully deleted repository. Reloading plugin...":
        "已成功删除仓库，正在重载插件…",
    "No repository found": "未找到仓库",
    "Discarded all changes in tracked files.": "已丢弃受跟踪文件中的全部改动。",
    "Discarded all files.": "已丢弃全部文件。",
    "Paused automatic routines.": "已暂停自动任务。",
    "Resumed automatic routines.": "已恢复自动任务。",

    // 仓库与远端
    "Initialize repository": "初始化仓库",
    "Create a Git repository for this vault and an initial commit.":
        "为本 Vault 创建 Git 仓库与初始提交。",
    "Clone repository": "克隆仓库",
    "Clone an existing remote repository into this vault.":
        "把现有远端仓库克隆到本 Vault。",
    Remote: "远端",
    "No remote configured": "尚未配置远端",
    "Manage remotes": "管理远端",
    Authentication: "认证",
    "Credentials are handled by the system Git credential helper; the plugin never stores passwords.":
        "认证交给系统 Git 凭据助手，插件不保存任何密码。",
    "Open guide": "查看说明",
    "Initial commit": "初始提交",
    "Initialized new repo": "已初始化新仓库",
    "Enter remote URL": "输入远端 URL",
    "Specify your username": "输入用户名",
    "Specify your password or token": "输入密码或访问令牌",
    "Enter directory for clone. It needs to be empty or not existent.":
        "输入克隆目录。目录需要为空或不存在。",
    "Vault Root": "Vault 根目录",
    "Does your remote repo contain a {dir} directory at the root?":
        "远端仓库根目录是否包含 {dir} 目录？",
    "DELETE ALL YOUR LOCAL CONFIG AND PLUGINS": "删除全部本地配置与插件",
    "Abort clone": "中止克隆",
    "To avoid conflicts, the local {dir} directory needs to be deleted.":
        "为避免冲突，需要删除本地 {dir} 目录。",
    "Specify depth of clone. Leave empty for full clone.":
        "指定克隆深度，留空表示完整克隆。",
    "Aborted clone": "已中止克隆",
    "Invalid depth. Aborting clone.": "深度无效，已中止克隆。",
    'Cloning new repo into "{dir}"': "正在把新仓库克隆到「{dir}」",
    "Cloned new repo.": "已克隆新仓库。",
    "Please restart Obsidian": "请重启 Obsidian",
    "Select or create a new remote by typing its name and selecting it":
        "选择远端，或输入新名称创建远端",
    "Select a remote": "选择远端",
    "Select or create a new remote branch by typing its name and selecting it":
        "选择远端分支，或输入新名称创建远端分支",
    "Select branch to checkout": "选择要检出的分支",
    "Custom base path (Git repository path)": "自定义基础路径（Git 仓库路径）",
    'Sets the relative path to the vault from which the Git binary should be executed. Mostly used to set the path to the Git repository, which is only required if the Git repository is below the vault root directory. Use "\\" instead of "/" on Windows.':
        "设置 Git 命令相对 Vault 的执行路径。一般仅在 Git 仓库位于 Vault 根目录之下时需要。Windows 上请用 \\ 代替 /。",
    "Custom Git directory path (Instead of '.git')":
        "自定义 Git 目录路径（替代 .git）",
    'Corresponds to the GIT_DIR environment variable. Relative paths are resolved from the custom base path, or the vault root when no base path is configured. Requires restart of Obsidian to take effect. Use "\\" instead of "/" on Windows.':
        "对应 GIT_DIR 环境变量。相对路径基于自定义基础路径解析，未配置基础路径时基于 Vault 根。需重启 Obsidian 生效。Windows 上请用 \\ 代替 /。",
    "Update submodules": "更新子模块",
    '"Commit-and-sync" and "pull" takes care of submodules. Missing features: Conflicted files, count of pulled/pushed/committed files. Tracking branch needs to be set for each submodule.':
        "「提交并同步」和「拉取」会处理子模块。已知缺失：冲突文件、拉取/推送/提交的文件数统计；每个子模块需设置跟踪分支。",
    "Submodule recurse checkout/switch": "子模块递归检出/切换",
    "Whenever a checkout happens on the root repository, recurse the checkout on the submodules (if the branches exist).":
        "根仓库发生检出时，在子模块上递归执行检出（若分支存在）。",
    "Custom Git binary path": "自定义 Git 可执行文件路径",
    "Specify the path to the Git binary/executable. Git should already be in your PATH. Should only be necessary for a custom Git installation.":
        "指定 Git 可执行文件的路径。Git 通常已在 PATH 中，仅在自定义安装时需要。",
    "Additional environment variables": "额外的环境变量",
    "Use each line for a new environment variable in the format KEY=VALUE .":
        "每行一个环境变量，格式 KEY=VALUE。",
    "Additional PATH environment variable paths": "额外的 PATH 环境变量路径",
    "Use each line for one path": "每行一个路径",
    "Reload with new environment variables": "用新环境变量重载",
    "Removing previously added environment variables will not take effect until Obsidian is restarted.":
        "移除之前添加的环境变量需重启 Obsidian 后才会生效。",
    Reload: "重载",

    // 同步触发
    "Automatic sync": "自动同步",
    "Focus on writing; configure when Git runs below.":
        "专注写作，在下方配置 Git 的执行时机。",
    "Repository summary": "仓库摘要",
    "Branch: {branch} · Remotes: {remotes}": "分支：{branch} · 远端：{remotes}",
    "No current branch": "无当前分支",
    "Repository summary unavailable": "暂时无法读取仓库摘要",
    "Manual sync": "手动同步",
    "Manual sync is always available from commands. It follows the pull and push preferences; it has no separate enable switch.":
        "可随时通过命令手动同步，遵循拉取与推送偏好；当前没有独立的启用开关。",
    "Scheduled execution": "定时执行",
    "Zero disables each timer. The commit interval follows the editing or fixed-interval preference. A separate push timer requires split timers.":
        "各间隔设为 0 即关闭。提交间隔遵循停止编辑或固定间隔偏好；独立推送定时器需要开启分离计时器。",
    "Pull on opening the vault": "启动时拉取",
    "Push after commit-and-sync": "提交并同步后推送",
    "This controls push in commit-and-sync, not every manual commit. Split automatic commits do not push; use the separate push timer.":
        "此开关控制“提交并同步”中的推送，并非每次手动提交。分离模式下自动提交不推送，请使用独立推送定时器。",
    "Automatic commit preferences": "自动提交偏好",
    "Split timers for automatic commit and sync": "分离自动提交与同步的定时器",
    "Enable to use one interval for commit and another for sync.":
        "开启后，为自动提交与同步使用不同间隔。",
    "Auto {kind} interval (minutes)": "自动{kind}间隔（分钟）",
    "{kind} changes every X minutes. Set to 0 (default) to disable. (See below setting for further configuration!)":
        "每 X 分钟{kind}一次改动。设为 0（默认）可禁用。（详见下方设置！）",
    "Auto {kind} after stopping file edits": "停止编辑后自动{kind}",
    "Requires the {kind} interval not to be 0. If turned on, do auto {kind} every {n} minutes after stopping file edits. This also prevents auto {kind} while editing a file. If turned off, it's independent from the last file edit.":
        "需要{kind}间隔不为 0。开启后，停止编辑文件 {n} 分钟后自动{kind}；编辑期间不会自动{kind}。关闭则与最后编辑时间无关。",
    "Auto {kind} after latest commit": "最近提交后自动{kind}",
    "If turned on, sets last auto {kind} timestamp to the latest commit timestamp. This reduces the frequency of auto {kind} when doing manual commits.":
        "开启后，把上次自动{kind}的时间戳设为最近一次提交的时间戳，从而在手动提交时降低自动{kind}的频率。",
    "Auto push interval (minutes)": "自动推送间隔（分钟）",
    "Push commits every X minutes. Set to 0 (default) to disable. Recommended: 30 minutes when enabled.":
        "每 X 分钟推送一次提交。设为 0 关闭（默认）；建议开启时使用 30 分钟。",
    "Auto pull interval (minutes)": "自动拉取间隔（分钟）",
    "Pull changes every X minutes. Set to 0 (default) to disable. Recommended: 30 minutes when enabled.":
        "每 X 分钟拉取一次改动。设为 0 关闭（默认）；建议开启时使用 30 分钟。",
    "Pull on startup": "启动时拉取",
    "Automatically pull commits when Obsidian starts.":
        "Obsidian 启动时自动拉取提交。",
    "Auto {kind} only staged files": "自动{kind}仅暂存文件",
    "If turned on, only staged files are committed on {kind}. If turned off, all changed files are committed.":
        "开启后，{kind}只提交已暂存的文件；关闭则提交所有改动文件。",
    "Specify custom commit message on auto {kind}":
        "自动{kind}时自定义提交信息",
    "You will get a pop up to specify your message.":
        "将弹出窗口让你填写提交信息。",

    // 拉取策略
    "Local change protection": "本地修改保护",
    "Merge preserves both histories. Local changes are protected before pulling; conflicts pause automatic routines. Stash is protection, not a pull strategy.":
        "merge 保留双方历史。拉取前先保护本地修改；出现冲突时暂停自动任务。stash 是保护机制，不是拉取策略。",
    "Rebase protects local changes first. Resolve rebase conflicts with native Git, or abort the rebase before resuming sync.":
        "rebase 前先保护本地修改。变基冲突需使用原生 Git 解决，或中止变基后再恢复同步。",
    "Reset backs up local history and uses --keep. It refuses to overwrite local changes; it does not silently discard the working tree.":
        "reset 先备份本地历史，再使用 --keep 对齐远端；可能覆盖本地修改时拒绝执行，不会静默丢弃工作区。",
    "Mobile Git uses merge. Desktop rebase and reset preferences do not apply.":
        "移动端 Git 使用 merge，桌面端的 rebase 和 reset 偏好不适用。",
    "Pull strategy": "拉取策略",
    "Decide how to integrate commits from your remote branch into your local branch.":
        "决定如何把远端分支的提交整合进本地分支。",
    Merge: "合并",
    Rebase: "变基",
    "Reset (only updates HEAD, leaving the working directory untouched)":
        "重置（仅更新 HEAD，不动工作区）",
    "Merge strategy on conflicts": "冲突时的合并策略",
    "Decide how to solve conflicts when pulling remote changes. This can be used to favor your local changes or the remote changes automatically.":
        "决定拉取远端改动时如何解决冲突：可自动偏向本地改动或远端改动。",
    "None (git default)": "无（git 默认）",
    "Our changes": "保留本地",
    "Their changes": "采用远端",
    "Push on commit-and-sync": "提交并同步时推送",
    "Most of the time you want to push after committing. Turning this off turns a commit-and-sync action into {action} only. It will still be called commit-and-sync.":
        "多数时候你希望在提交后推送。关闭后，提交并同步只会{action}，但仍称为提交并同步。",
    "Pull on commit-and-sync": "提交并同步时拉取",
    "On commit-and-sync, pull commits as well. Turning this off turns a commit-and-sync action into {action} only.":
        "提交并同步时也拉取提交。关闭后，提交并同步只会{action}。",
    "Squash commits before push": "推送前压缩提交",
    "On commit-and-sync, squash all local unpushed commits into a single commit right before pushing. Keeps the remote history clean when committing often. Only unpushed commits are rewritten, so no force-push is needed.":
        "提交并同步时，在推送前把本地所有未推送提交压缩成一个，让频繁提交下的远端历史保持干净。只改写未推送提交，无需 force push。",

    // 提交
    "Commit message on auto {kind}": "自动{kind}提交信息",
    "Available placeholders: {{date}} (see below), {{hostname}} (see below), {{numFiles}} (number of changed files in the commit) and {{files}} (changed files in commit message).":
        "可用占位符：{{date}}（见下）、{{hostname}}（见下）、{{numFiles}}（本次提交改动的文件数）、{{files}}（提交信息中的改动文件）。",
    "Commit message on manual commit": "手动提交时的提交信息",
    "Available placeholders: {{date}} (see below), {{hostname}} (see below), {{numFiles}} (number of changed files in the commit) and {{files}} (changed files in commit message). Leave empty to require manual input on each commit.":
        "可用占位符：{{date}}（见下）、{{hostname}}（见下）、{{numFiles}}（本次提交改动的文件数）、{{files}}（提交信息中的改动文件）。留空则每次提交时手动输入。",
    'Set to default: "{template}"': "设为默认：{template}",
    "Commit message script": "提交信息脚本",
    "A script that is run using 'sh -c' to generate the commit message. May be used to generate commit messages using AI tools. Available placeholders: {{hostname}}, {{date}}.":
        "通过 'sh -c' 运行以生成提交信息的脚本，可用于 AI 工具生成提交信息。可用占位符：{{hostname}}、{{date}}。",
    "{{date}} placeholder format": "{{date}} 占位符格式",
    ' Specify custom date format. E.g. "YYYY-MM-DD HH:mm:ss". See ':
        ' 指定自定义日期格式。例如 "YYYY-MM-DD HH:mm:ss"。参见 ',
    "Moment.js documentation": "Moment.js 文档",
    " for more formats.": " 获取更多格式。",
    "{{hostname}} placeholder replacement": "{{hostname}} 占位符替换",
    "Specify custom hostname for every device. Defaults to the OS hostname if not set on desktop.":
        "为每台设备指定自定义主机名；桌面端未设置时默认使用操作系统主机名。",
    "Preview commit message": "预览提交信息",
    Preview: "预览",
    "List filenames affected by commit in the commit body":
        "在提交正文中列出受影响的文件",
    "Commit author": "提交作者",
    "Author name for commit": "提交作者姓名",
    "Author email for commit": "提交作者邮箱",
    "Username on your git server. E.g. your username on GitHub":
        "Git 服务器用户名（例如 GitHub 用户名）",
    "Password/Personal access token": "密码 / 个人访问令牌",
    "Type in your password. You won't be able to see it again.":
        "输入密码。之后将无法再次查看。",

    // 通知
    "Disable informative notifications": "关闭信息通知",
    "Disable informative notifications for git operations to minimize distraction (refer to status bar for updates).":
        "关闭 Git 操作的信息通知以减少打扰（请参考状态栏更新）。",
    "Disable error notifications": "关闭错误通知",
    "Disable error notifications of any kind to minimize distraction (refer to status bar for updates).":
        "关闭所有错误通知以减少打扰（请参考状态栏更新）。",
    "Hide notifications for no changes": "无改动时隐藏通知",
    "Don't show notifications when there are no changes to commit or push.":
        "没有需要提交或推送的改动时不显示通知。",
    "Show status bar": "显示状态栏",
    "Obsidian must be restarted for the changes to take affect.":
        "更改后需重启 Obsidian 才能生效。",
    "Show branch status bar": "显示分支状态栏",
    "Show the count of modified files in the status bar":
        "在状态栏显示修改文件数",

    // 高级
    "Hunk management": "块（Hunk）管理",
    "Hunks are sections of grouped line changes right in your editor.":
        "块（Hunk）是编辑器内成组的行改动。",
    Signs: "标记",
    "This allows you to see your changes right in your editor via colored markers and stage/reset/preview individual hunks.":
        "通过彩色标记在编辑器内直接查看改动，并逐个块执行暂存/重置/预览。",
    "Hunk commands": "块命令",
    "Adds commands to stage/reset individual Git diff hunks and navigate between them via 'Go to next/prev hunk' commands.":
        "添加暂存/重置单个 diff 块的命令，以及「下一个/上一个块」导航命令。",
    "Status bar with summary of line changes": "行改动摘要状态栏",
    Disabled: "关闭",
    Colored: "彩色",
    Monochrome: "单色",
    "Line author information": "行作者信息",
    "History view": "历史视图",
    "Show Author": "显示作者",
    "Show the author of the commit in the history view.":
        "在历史视图中显示提交作者。",
    Hide: "隐藏",
    Full: "完整",
    Initials: "缩写",
    "Show Date": "显示日期",
    "Show the date of the commit in the history view. The {{date}} placeholder format is used to display the date.":
        "在历史视图中显示提交日期，使用 {{date}} 占位符格式。",
    "Source control view": "源码控制视图",
    "Automatically refresh source control view on file changes":
        "文件变化时自动刷新源码控制视图",
    "On slower machines this may cause lags. If so, just disable this option.":
        "在较慢的机器上可能造成卡顿，可关闭此选项。",
    "Source control view refresh interval": "源码控制视图刷新间隔",
    "Milliseconds to wait after file change before refreshing the Source Control View.":
        "文件变化后等待多少毫秒刷新源码控制视图。",
    "Diff view style": "差异视图样式",
    'Set the style for the diff view. Note that the actual diff in "Split" mode is not generated by Git, but the editor itself instead so it may differ from the diff generated by Git. One advantage of this is that you can edit the text in that view.':
        "设置差异视图样式。注意：拆分模式的差异不是由 Git 生成，而是编辑器自身生成，可能与 Git 生成的差异不同；好处是可以在该视图内直接编辑文本。",
    Split: "拆分",
    Unified: "统一",
    "File menu integration": "文件菜单集成",
    'Add "Stage", "Unstage" and "Add to .gitignore" actions to the file menu.':
        "在文件菜单中加入「暂存」「取消暂存」和「加入 .gitignore」操作。",
    "Disable on this device": "在本设备停用",
    "Disables the plugin on this device. This setting is not synced.":
        "在本设备停用插件。此设置不参与同步。",
    "Copy Debug Information": "复制调试信息",
    "Debug information copied to clipboard. May contain sensitive information!":
        "调试信息已复制到剪贴板。可能包含敏感信息！",
    "Debugging and logging:\nYou can always see the logs of this and every other plugin by opening the console with":
        "调试与日志：\n你可以随时通过打开控制台查看本插件及所有其他插件的日志，快捷键",

    // 行作者
    "Show commit authoring information next to each line":
        "在每行旁边显示提交作者信息",
    "Only available on desktop currently.": "目前仅桌面端可用。",
    "Feature guide and quick examples": "功能指南与快速示例",
    " The commit hash, author name and authoring date can all be individually toggled.":
        " 提交哈希、作者名与编写日期都可以单独开关。",
    "Hide everything, to only show the age-colored sidebar.":
        "全部隐藏，仅显示按时间着色的侧边栏。",
    "Follow movement and copies across files and commits":
        "跨文件与提交跟踪移动与复制",
    "Do not follow (default)": "不跟踪（默认）",
    "Follow within same commit": "同一提交内跟踪",
    "Follow within all commits (maybe slow)": "所有提交内跟踪（可能较慢）",
    "By default (deactivated), each line only shows the newest commit where it was changed.":
        "默认（关闭）时，每行只显示它最近一次改动的提交。",
    "With ": "使用 ",
    "same commit": "同一提交",
    ", cut-copy-paste-ing of text is followed within the same commit and the original commit of authoring will be shown.":
        "，可以在同一提交内跟踪文本的剪切-复制-粘贴，并显示最初的编写提交。",
    "all commits": "所有提交",
    ", cut-copy-paste-ing text inbetween multiple commits will be detected.":
        "，可以检测跨越多个提交的文本剪切-复制-粘贴。",
    "It uses ": "它使用 ",
    " and for matches (at least {n} characters) within the same (or all) commit(s), ":
        "，并且对于同一（或所有）提交中至少 {n} 个字符的匹配，",
    "the originating": "最初的",
    " commit's information is shown.": " 提交信息会被显示。",
    "Show commit hash": "显示提交哈希",
    "Author name display": "作者名显示",
    "If and how the author is displayed": "是否以及如何显示作者",
    "Initials (default)": "缩写（默认）",
    "First name": "名",
    "Last name": "姓",
    "Full name": "全名",
    "Authoring date display": "编写日期显示",
    "If and how the date and time of authoring the line is displayed":
        "是否以及如何显示每行的编写日期时间",
    "Date (default)": "日期（默认）",
    "Date and time": "日期和时间",
    "Natural language": "自然语言",
    Custom: "自定义",
    "Custom authoring date format": "自定义编写日期格式",
    "Authoring date display timezone": "编写日期显示时区",
    "My local (default)": "我的本地时区（默认）",
    "Author's local": "作者本地时区",
    "The time-zone in which the authoring date should be shown.\nEither your local time-zone (default),\nthe author's time-zone during commit creation or\n":
        "编写日期的显示时区。\n可以是你的本地时区（默认）、\n作者提交时的时区，或\n",
    "UTC±00:00": "UTC±00:00",
    ".": "。",
    "Oldest age in coloring": "着色中的最老时间",
    'The oldest age in the line author coloring. Everything older will have the same color.\nSmallest valid age is "1d". Currently: {duration}':
        '行作者着色中的最老时间。更老的改动都使用同一颜色。\n最小有效值为 "1d"。当前：{duration}',
    " days": " 天",
    "invalid!": "无效！",
    "Text color": "文本颜色",
    "The CSS color of the gutter text.": "行号槽文本的 CSS 颜色。",
    "It is highly recommended to use ": "强烈建议使用 ",
    "CSS variables": "CSS 变量",
    " defined by themes (e.g. ": "主题定义的 ",
    " or ": " 或 ",
    "), because they automatically adapt to theme changes.":
        "），因为它们会自动适配主题变化。",
    "See: ": "参见：",
    "List of available CSS variables in Obsidian":
        "Obsidian 可用的 CSS 变量列表",
    "Ignore whitespace and newlines in changes": "忽略改动中的空白与换行",
    "Whitespace and newlines are interpreted as part of the document and in changes by default (hence not ignored). This makes the last line being shown as 'changed' when a new subsequent line is added, even if the previously last line's text is the same.":
        "默认情况下，空白与换行被视作文档与改动的一部分（因此不会被忽略）。这会导致新增一行时，上一行被显示为「已改动」，即使其文本未变。",
    "If you don't care about purely-whitespace changes (e.g. list nesting / quote indentation changes), then activating this will provide more meaningful change detection.":
        "如果你不关心纯空白改动（例如列表嵌套、引用缩进），开启本项可得到更有意义的改动检测。",
    "Color for {which} commits": "{which}提交的颜色",
    "oldest ({age} or older)": "最老（{age} 或更老）",
    newest: "最新",
    "Supports 'rgb(r,g,b)', 'hsl(h,s,l)', hex (#) and named colors (e.g. 'black', 'purple'). Color preview: ":
        "支持 'rgb(r,g,b)'、'hsl(h,s,l)'、十六进制 (#) 与命名颜色（如 'black'、'purple'）。颜色预览：",
    "invalid color": "无效颜色",
    "Format string": "格式字符串",
    " to display the authoring date.": " 用于显示编写日期。",
    "Currently: {datetime}": "当前：{datetime}",

    // 新版设置
    English: "English",
    Editor: "编辑器",
    Views: "视图",
    Enabled: "开启",
    "Enter a whole number.": "请输入整数。",
    "Global: {value}": "全局设置：{value}",
    "Stage all changes when nothing is staged": "没有暂存内容时暂存全部改动",
    "When using Commit with nothing staged, stage and commit all changes. Commit all changes and Commit-and-sync are unaffected.":
        "使用「提交」且没有暂存内容时，暂存并提交全部改动。「提交全部改动」和「提交并同步」不受影响。",
    "Auto-stash changes when rebasing": "变基时自动暂存工作区改动",
    "Stash local changes before rebasing and restore them afterward. Restoring may produce conflicts.":
        "变基前使用 stash 暂存本地改动，完成后恢复。恢复时可能产生冲突。",
    "Use Git configuration": "使用 Git 配置",
    "Reset to remote (--keep; backs up local history, updates tracked files, and aborts if local changes would be overwritten)":
        "重置到远端（--keep；先备份本地历史，再更新受跟踪文件；若会覆盖本地改动则中止）",
    "Diff view": "差异视图",
    "Split mode creates an editable diff in the editor, which may differ from Git's diff.":
        "拆分模式在编辑器中生成可编辑的差异，可能与 Git 生成的差异不同。",
    "Split diff computation time limit (ms)": "拆分差异计算时限（毫秒）",
    "Maximum milliseconds to compute a detailed split diff. Read-only diffs use ten times this value.":
        "计算详细拆分差异的最长时间（毫秒）。只读差异使用此值的十倍。",
    "Show informational notifications": "显示信息通知",
    "Show notices about Git operations. The status bar still shows updates when this is off.":
        "显示 Git 操作的信息通知。关闭后，状态栏仍会显示更新。",
    "Show error notifications": "显示错误通知",
    "Show error notices for Git operations.": "显示 Git 操作的错误通知。",
    "Show notifications when nothing changed": "无改动时显示通知",
    "Also notify when a commit or push finds no changes.":
        "提交或推送时未发现改动也显示通知。",
    "Add Stage, Unstage, and Add to .gitignore actions to the file menu.":
        "在文件菜单中加入「暂存」「取消暂存」和「加入 .gitignore」操作。",
    "Select or create a secret stored on this device for this vault.":
        "为此 Vault 选择或创建保存在本设备上的密钥。",
    "Limit file operations to the vault": "将文件操作限制在 Vault 内",
    "Limit status, staging, unstaging, discarding, and submodule updates to the vault where possible. Repository history and remote actions remain repository-wide.":
        "尽可能将状态查询、暂存、取消暂存、丢弃改动及子模块更新限制在 Vault 内。仓库历史与远端操作仍作用于整个仓库。",
    "Leave empty when the repository is at the root.":
        "仓库位于 Vault 根目录时留空。",
    "Choose an existing folder in this vault.":
        "请选择此 Vault 中已有的文件夹。",
    "Debugging and logging": "调试与日志",
    "May contain sensitive settings.": "可能包含敏感设置。",
    "Changes only this repository's Git config. Leave blank to use the global author name, if configured.":
        "仅修改此仓库的 Git 配置。留空时使用已配置的全局作者姓名。",
    "Saved in this repository's Git config. Mobile Git has no global author name fallback.":
        "保存在此仓库的 Git 配置中。移动端 Git 不会回退到全局作者姓名。",
    "Changes only this repository's Git config. Leave blank to use the global author email, if configured.":
        "仅修改此仓库的 Git 配置。留空时使用已配置的全局作者邮箱。",
    "Saved in this repository's Git config. Mobile Git has no global author email fallback.":
        "保存在此仓库的 Git 配置中。移动端 Git 不会回退到全局作者邮箱。",
    "Copies only boolean and numeric settings; excludes credentials, paths, and custom text.":
        "仅复制开关与数值设置，不包含凭据、路径及自定义文本。",
    "Sanitized debug information copied to clipboard.":
        "已将脱敏后的调试信息复制到剪贴板。",
    "Open the developer console with {shortcut}.":
        "使用 {shortcut} 打开开发者控制台。",
    Support: "支持",
    Donate: "捐赠",
    "Support continued development of the plugin.": "支持插件的持续开发。",
    "abcdef Author Name {date}": "abcdef 作者姓名 {date}",

    // 合并冲突与提交操作
    "Keep ours": "保留本地内容",
    "Keep theirs": "采用传入内容",
    "Keep both": "保留双方内容",
    "Keep base": "保留共同祖先内容",
    "Keep all ours": "全部保留本地内容",
    "Keep all theirs": "全部采用传入内容",
    "Keep all base": "全部保留共同祖先内容",
    "{n} conflict(s) in file": "文件中有 {n} 处冲突",
    "Mark resolved": "标记为已解决",
    "No conflicts left": "没有剩余冲突",
    "{n} conflict(s) left": "剩余 {n} 处冲突",
    "Merge in progress": "合并进行中",
    "Merge in progress. Select for help resolving and finishing the merge.":
        "合并进行中。点击查看解决冲突与完成合并的帮助。",
    "Merge in progress. Select the merge icon for help resolving and finishing it.":
        "合并进行中。点击合并图标查看解决冲突与完成合并的帮助。",
    "Merge in progress - select for help": "合并进行中，点击查看帮助",
    "Git is combining the version in your vault with changes from another version. The merge must be committed before Obsidian Git can push or resume automatic commits.":
        "Git 正在将 Vault 中的版本与另一版本的改动合并。必须先提交此次合并，Obsidian Git 才能推送或恢复自动提交。",
    "Resolve the conflicts": "解决冲突",
    "Git could not combine some parts automatically. Open each conflicted file and review every highlighted conflict block.":
        "Git 无法自动合并部分内容。请打开每个冲突文件，逐一检查高亮的冲突块。",
    "Choose {ours} for your local text, {theirs} for the incoming text, {both}, or edit the block manually.":
        "选择「{ours}」保留本地文本，选择「{theirs}」采用传入文本，选择「{both}」，或手动编辑冲突块。",
    "When the file's conflict count reaches zero, select the plus icon next to it to mark it as resolved.":
        "文件的冲突数量变为零后，点击旁边的加号图标，将其标记为已解决。",
    "Repeat this for every file in the Conflicts section.":
        "对「冲突」区域中的每个文件重复上述操作。",
    "All conflicts have been marked as resolved.": "所有冲突均已标记为已解决。",
    "The merge is still active until you commit the staged changes.":
        "提交已暂存的改动后，此次合并才会完成。",
    "Finish the merge": "完成合并",
    "After the Conflicts section is empty, enter a commit message and commit the staged changes. This finishes the merge. You can then push normally.":
        "「冲突」区域清空后，输入提交信息并提交已暂存的改动，即可完成合并。之后可正常推送。",
    "Got it": "知道了",
    "Resolve conflicts before committing": "请先解决冲突再提交",
    "Finish merge and sync": "完成合并并同步",
    "Finish merge": "完成合并",
    "Sync (no changes to commit)": "同步（没有需要提交的改动）",
    "Commit all changes and sync": "提交全部改动并同步",
    "Commit {n} staged file(s)": "提交 {n} 个已暂存文件",
    "Nothing staged - stage changes before committing":
        "没有暂存内容，请先暂存改动再提交",
    "Stage and commit all {n} changed file(s)": "暂存并提交全部 {n} 个改动文件",
    "Stage all and commit": "全部暂存并提交",
    "Commit staged and sync": "提交已暂存内容并同步",
    "More commit actions": "更多提交操作",
    "Automatic commit stopped because of unresolved conflicts":
        "存在未解决的冲突，自动提交已停止",
    "Did not commit automatically because a merge is in progress. Commit it manually.":
        "合并进行中，未执行自动提交。请手动提交。",
    "Nothing staged. Stage changes first or use Commit all changes.":
        "没有暂存内容。请先暂存改动，或使用「提交全部改动」。",
    "Cannot push while a merge is still in progress": "合并尚未完成，无法推送",
    "Cannot pull while a merge is still in progress": "合并尚未完成，无法拉取",
    "Merge conflict in {n} file(s). Resolve conflicts and commit manually.":
        "{n} 个文件存在合并冲突。请解决冲突后手动提交。",
    "Merge conflict. Resolve conflicts and commit manually.":
        "存在合并冲突。请解决冲突后手动提交。",
    "Rebase is in progress. Do not use ordinary commit commands. Resolve and stage conflicts, then run native Git `git rebase --continue`, or use `git rebase --abort` to abort.":
        "变基进行中，请勿使用普通提交命令。解决并暂存冲突后，使用原生 Git 执行 `git rebase --continue` 继续，或执行 `git rebase --abort` 中止。",
    "Rebase in progress": "变基进行中",
    "During rebase, ours is the branch being rebased onto and theirs is the commit being replayed. Review both sides carefully, or edit the conflict manually.":
        "变基时，ours 指变基的目标分支，theirs 指正在重放的提交。请仔细检查双方内容，或手动编辑冲突。",
    "The rebase is still active. Run `git rebase --continue` after staging the resolved files; further commits may have conflicts.":
        "变基尚未完成。暂存已解决冲突的文件后，执行 `git rebase --continue` 继续；后续提交仍可能产生冲突。",
    "Continue the rebase": "继续变基",

    // 差异编辑器的保存保护
    "Cannot edit a file outside the vault.": "无法编辑 Vault 外的文件。",
    "The file changed outside the diff editor. Save was blocked; copy your unsaved edits before reloading.":
        "文件已在差异编辑器之外发生改动。已阻止保存；重新加载前，请复制尚未保存的编辑内容。",
    "Could not save the diff editor changes.": "无法保存差异编辑器中的改动。",
    "Working Tree": "工作区",
    Index: "索引",
    "Diff: {file} ({ref})": "差异：{file}（{ref}）",

    // 固定错误原文由 displayError 的统一翻译入口处理
    "Push rejected because the tag already exists on the remote.":
        "推送被拒绝：远端已存在此标签。",
    "Push rejected. Pull changes from the remote, resolve any conflicts, then push again.":
        "推送被拒绝。请先拉取远端改动，解决所有冲突后再推送。",
    "Cannot pull because a merge is still in progress. Commit or abort it first.":
        "合并尚未完成，无法拉取。请先提交或中止此次合并。",
    "Merge conflict was not reproduced.": "未能复现合并冲突。",
    "Pull did not produce a commit to check out.": "拉取未生成可供检出的提交。",
    "isomorphic-git returned invalid unmerged paths":
        "isomorphic-git 返回的未合并文件路径无效",
    "Git author name and email are not set. Please set both fields in the settings.":
        "尚未设置 Git 作者姓名和邮箱。请在设置中填写这两个字段。",
    "isomorphic-git walk returned a non-array result":
        "isomorphic-git 的文件遍历返回了非数组结果",

    // 仓库操作与新版通知
    Yes: "是",
    No: "否",
    "Git is not ready": "Git 未就绪",
    "Cannot clone into the vault root when the remote contains {dir}. Your local configuration and plugins are preserved. Clone into an empty subdirectory instead.":
        "远端包含 {dir} 时，不能克隆到 Vault 根目录。已保留本地配置和插件，请改为克隆到空子目录。",
    "Pulled {n} file(s) from remote ({inside} in the vault, {outside} outside)":
        "已从远端拉取 {n} 个文件（Vault 内 {inside} 个，Vault 外 {outside} 个）",
    "Commit message script exited with code {code}":
        "提交信息脚本退出，退出码为 {code}",
    "No current branch found. Cannot push.": "未找到当前分支，无法推送。",
    "Applying a patch is only supported on desktop": "应用补丁仅在桌面端受支持",
    "Raw Git commands are only supported on desktop":
        "原生 Git 命令仅在桌面端受支持",
    "Reloading native Git is only supported on desktop":
        "重载原生 Git 仅在桌面端受支持",
    "This branch isn't merged into HEAD. Force delete?":
        "此分支尚未合并到 HEAD。是否强制删除？",
    "Upstream branch will be created on first push. Skipping pull.\nUse set upstream branch command to set it manually if desired.":
        "上游分支将在首次推送时创建，已跳过拉取。\n如需手动设置，请使用「设置上游分支」命令。",
    "Cannot find a Git repository. Please create one via the given command, clone an existing repo or configure repo location.":
        "找不到 Git 仓库。请使用相应命令创建仓库、克隆现有仓库，或配置仓库位置。",
    "Open file at this commit": "打开此提交中的文件",
    "Source Control": "源码控制",
    History: "历史",
    "File at commit": "提交中的文件",
    "Diff View": "差异视图",
    "No Git repository found.": "未找到 Git 仓库。",
    Conflicts: "冲突",
    "Staged Changes": "已暂存的改动",
    "Staged outside vault": "Vault 外的已暂存改动",
    "Conflicts outside vault": "Vault 外的冲突",
    Changes: "改动",
    "Recently Pulled Files": "最近拉取的文件",

    // 搜索面板与 Git 动态进度阶段
    Find: "查找",
    next: "下一个",
    previous: "上一个",
    all: "全部",
    "match case": "区分大小写",
    regexp: "正则表达式",
    "by word": "全字匹配",
    close: "关闭",
    "current match": "当前匹配",
    "on line": "所在行",
    Cloning: "正在克隆",
    Working: "正在处理",
    counting: "正在统计对象",
    compressing: "正在压缩对象",
    receiving: "正在接收对象",
    resolving: "正在解析差异",
    writing: "正在写入对象",
    "Enumerating objects": "正在枚举对象",
    "Counting objects": "正在统计对象",
    "Compressing objects": "正在压缩对象",
    "Receiving objects": "正在接收对象",
    "Resolving deltas": "正在解析差异",
    "Writing objects": "正在写入对象",
    "Analyzing workdir": "正在分析工作区",
    "Updating workdir": "正在更新工作区",
    "Askpass server cannot be started again": "认证服务不能重复启动",
    "Askpass server stopped during startup": "认证服务在启动期间停止",
    "Enter Git username": "请输入 Git 用户名",
    "Enter Git password or passphrase": "请输入 Git 密码、令牌或密钥口令",
    "Git authentication request: {prompt}": "Git 认证请求：{prompt}",
};

let currentLocale: Locale = "zh";

/** 设置当前语言（默认中文）。 */
export function setLocale(locale: Locale): void {
    currentLocale = locale;
}

export function getLocale(): Locale {
    return currentLocale;
}

/** 解析持久化存储中的语言值；无效或缺失时回退到中文。 */
export function parseLocale(value: unknown): Locale {
    return value === "en" || value === "zh" ? value : "zh";
}

/**
 * 翻译一段文案；当前语言缺失条目时回退到英文 key 本身。
 * 支持 `{name}` 形式的参数替换。
 */
export function t(
    key: string,
    params?: Record<string, string | number>
): string {
    const table = currentLocale === "zh" ? zh : undefined;
    const text =
        table && Object.prototype.hasOwnProperty.call(table, key)
            ? (table[key] ?? key)
            : key;
    // 双层花括号属于提交模板；插值只替换单层参数，且不递归处理参数值。
    return text.replace(
        /\{\{[^{}]+\}\}|\{([^{}]+)\}/g,
        (match, name: string) =>
            params && name && Object.prototype.hasOwnProperty.call(params, name)
                ? String(params[name])
                : match
    );
}
