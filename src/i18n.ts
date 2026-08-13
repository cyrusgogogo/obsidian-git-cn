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
    let text = table?.[key] ?? key;
    if (params) {
        for (const [name, value] of Object.entries(params)) {
            text = text.replaceAll(`{${name}}`, String(value));
        }
    }
    return text;
}
