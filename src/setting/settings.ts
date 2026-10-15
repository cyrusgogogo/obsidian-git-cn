import type {
    App,
    RGB,
    SettingDefinition,
    SettingDefinitionItem,
} from "obsidian";
import {
    moment,
    Notice,
    Platform,
    PluginSettingTab,
    SecretComponent,
    Setting,
    SettingPage,
} from "obsidian";
import {
    DEFAULT_SETTINGS,
    GIT_LINE_AUTHORING_MOVEMENT_DETECTION_MINIMAL_LENGTH,
} from "src/constants";
import { IsomorphicGit } from "src/gitManager/isomorphicGit";
import { SimpleGit } from "src/gitManager/simpleGit";
import { previewColor } from "src/editor/lineAuthor/lineAuthorProvider";
import type {
    LineAuthorDateTimeFormatOptions,
    LineAuthorDisplay,
    LineAuthorFollowMovement,
    LineAuthorSettings,
    LineAuthorTimezoneOption,
} from "src/editor/lineAuthor/model";
import { parseLocale, setLocale, t } from "src/i18n";
import type ObsidianGit from "src/main";
import type { ObsidianGitSettings } from "src/types";
import { convertToRgb, rgbToString } from "src/utils";

const FORMAT_STRING_REFERENCE_URL =
    "https://momentjs.com/docs/#/parsing/string-format/";
const LINE_AUTHOR_FEATURE_WIKI_LINK =
    "https://publish.obsidian.md/git-doc/Line+Authoring";
const AUTHENTICATION_GUIDE_URL =
    "https://raw.githubusercontent.com/cyrusgogogo/obsidian-git-cn/master/docs/Authentication.zh.md";
const INVERTED_CONTROLS: Partial<Record<string, keyof ObsidianGitSettings>> = {
    showInformationalNotifications: "disablePopups",
    showNoChangesNotifications: "disablePopupsForNoChanges",
    pushOnCommitAndSync: "disablePush",
};
const AUTOMATIC_RELOADS: Record<string, ("commit" | "push" | "pull")[]> = {
    differentIntervalCommitAndPush: ["commit", "push"],
    autoBackupAfterFileChange: ["commit"],
    setLastSaveToLastCommit: ["commit"],
    autoSaveInterval: ["commit"],
    autoPushInterval: ["push"],
    autoPullInterval: ["pull"],
};
const validateInteger = (value: number): string | undefined =>
    Number.isInteger(value) ? undefined : t("Enter a whole number.");

export class ObsidianGitSettingsTab extends PluginSettingTab {
    lineAuthorColorSettings: Map<"oldest" | "newest", Setting> = new Map();
    private lineAuthorRefreshTimer?: number;

    constructor(
        app: App,
        private plugin: ObsidianGit
    ) {
        super(app, plugin);
    }

    icon = "git-pull-request";

    private get settings() {
        return this.plugin.settings;
    }

    private toggle(
        name: string,
        key: string,
        desc?: string
    ): SettingDefinition {
        return {
            name: t(name),
            desc: desc === undefined ? undefined : t(desc),
            control: { type: "toggle", key },
        };
    }

    private dropdown(
        name: string,
        key: string,
        options: Record<string, string>,
        desc?: string
    ): SettingDefinition {
        return {
            name: t(name),
            desc: desc === undefined ? undefined : t(desc),
            control: {
                type: "dropdown",
                key,
                options: Object.fromEntries(
                    Object.entries(options).map(([value, label]) => [
                        value,
                        t(label),
                    ])
                ),
            },
        };
    }

    private get commitOrSync(): string {
        return this.settings.differentIntervalCommitAndPush
            ? "commit"
            : "commit-and-sync";
    }

    private renderRepositoryAuthor(
        setting: Setting,
        key: "user.name" | "user.email"
    ): void {
        setting.addText((text) => {
            const manager = this.plugin.gitManager;
            let edited = false;
            void (async () => {
                const local = await manager.getConfig(key, "local");
                if (!edited) text.setValue(local ?? "");
                if (manager instanceof SimpleGit) {
                    const global = await manager.getConfig(key, "global");
                    if (global)
                        text.setPlaceholder(
                            t("Global: {value}", { value: global })
                        );
                }
            })().catch((error) => this.plugin.displayError(error));

            text.onChange(async (value) => {
                edited = true;
                await this.plugin.gitActions.setGitConfig(
                    key,
                    value || undefined
                );
            });
        });
    }

    private resolveControl(key: string) {
        const invertedKey = INVERTED_CONTROLS[key];
        const storedKey = invertedKey ?? key;
        const isHunk = storedKey.startsWith("hunks.");
        return {
            storedKey,
            inverted: invertedKey !== undefined,
            target: (isHunk
                ? this.settings.hunks
                : this.settings) as unknown as Record<string, unknown>,
            field: isHunk ? storedKey.slice("hunks.".length) : storedKey,
        };
    }

    getControlValue(key: string): unknown {
        const { target, field, inverted } = this.resolveControl(key);
        const value = target[field];
        return inverted ? !value : value;
    }

    async setControlValue(key: string, value: unknown): Promise<void> {
        const { storedKey, target, field, inverted } = this.resolveControl(key);
        if (storedKey === "basePath") {
            await this.plugin.changeBasePath(value as string);
            return;
        }
        if (storedKey === "language") value = parseLocale(value);
        if (inverted) value = !value;
        if (
            (storedKey === "autoCommitMessage" ||
                storedKey === "commitMessageScript") &&
            value === ""
        ) {
            value = DEFAULT_SETTINGS[storedKey];
        }
        target[field] = value;
        if (storedKey === "language") setLocale(this.settings.language);
        await this.plugin.saveSettings();

        const automaticTypes = AUTOMATIC_RELOADS[storedKey];
        if (automaticTypes) {
            this.plugin.automaticsManager.reload(...automaticTypes);
        }
        if (
            storedKey === "language" ||
            storedKey === "differentIntervalCommitAndPush" ||
            storedKey === "autoSaveInterval" ||
            storedKey === "disablePush" ||
            storedKey === "pullBeforePush"
        ) {
            this.update();
        }
        if (storedKey.startsWith("hunks.")) {
            this.plugin.editorIntegration.refreshSignsSettings();
        } else if (
            storedKey === "authorInHistoryView" ||
            storedKey === "dateInHistoryView" ||
            storedKey === "limitToVault"
        ) {
            await this.plugin.refresh();
        } else if (storedKey === "refreshSourceControlTimer") {
            this.plugin.setRefreshDebouncer();
        }
        // 其余控件的可见性和禁用条件由 Obsidian 在写入后刷新。
    }

    getSettingDefinitions(): SettingDefinitionItem[] {
        const ready = () => this.plugin.gitReady;
        const desktop = () => this.plugin.gitManager instanceof SimpleGit;
        const mobile = () => this.plugin.gitManager instanceof IsomorphicGit;
        const kind = t(this.commitOrSync);
        return [
            this.dropdown(
                "Language",
                "language",
                { zh: "中文", en: "English" },
                "Display language of the plugin interface."
            ),
            {
                name: t(
                    "Git is not ready. When all settings are correct you can configure commit-sync, etc."
                ),
                visible: () => !ready(),
                status: "warning",
            },
            {
                type: "page",
                name: t("Repository & Remote"),
                items: [
                    {
                        name: t("Initialize repository"),
                        desc: t(
                            "Create a Git repository for this vault and an initial commit."
                        ),
                        render: (setting) => {
                            setting.addButton((button) =>
                                button
                                    .setButtonText(t("Initialize repository"))
                                    .onClick(async () => {
                                        await this.plugin.gitActions
                                            .createNewRepo()
                                            .catch((error: unknown) =>
                                                this.plugin.displayError(error)
                                            );
                                        this.update();
                                    })
                            );
                        },
                    },
                    {
                        name: t("Clone repository"),
                        desc: t(
                            "Clone an existing remote repository into this vault."
                        ),
                        render: (setting) => {
                            setting.addButton((button) =>
                                button
                                    .setButtonText(t("Clone repository"))
                                    .onClick(async () => {
                                        await this.plugin.gitActions
                                            .cloneNewRepo()
                                            .catch((error: unknown) =>
                                                this.plugin.displayError(error)
                                            );
                                        this.update();
                                    })
                            );
                        },
                    },
                    {
                        name: t("Remote"),
                        desc: t("No remote configured"),
                        render: (setting) => {
                            setting.addButton((button) =>
                                button
                                    .setButtonText(t("Manage remotes"))
                                    .onClick(async () => {
                                        await this.plugin.gitActions
                                            .editRemotes()
                                            .catch((error: unknown) =>
                                                this.plugin.displayError(error)
                                            );
                                        this.update();
                                    })
                            );
                            if (ready()) {
                                void this.plugin.gitManager
                                    .getRemotes()
                                    .then(async (remotes) => {
                                        if (!remotes.length) return;
                                        const urls = await Promise.all(
                                            remotes.map((name) =>
                                                this.plugin.gitManager.getRemoteUrl(
                                                    name
                                                )
                                            )
                                        );
                                        setting.descEl.setText(
                                            remotes
                                                .map(
                                                    (name, index) =>
                                                        `${name}: ${urls[index] ?? ""}`
                                                )
                                                .join("\n")
                                        );
                                    })
                                    .catch(() => undefined);
                            }
                        },
                    },
                    {
                        name: t("Authentication"),
                        desc: t(
                            "Credentials are handled by the system Git credential helper; the plugin never stores passwords."
                        ),
                        visible: desktop,
                        render: (setting) => {
                            setting.addButton((button) =>
                                button
                                    .setButtonText(t("Open guide"))
                                    .onClick(() =>
                                        window.open(AUTHENTICATION_GUIDE_URL)
                                    )
                            );
                        },
                    },
                ],
            },
            {
                type: "page",
                name: t("Sync Triggers"),
                visible: ready,
                items: [
                    this.toggle(
                        "Split timers for automatic commit and sync",
                        "differentIntervalCommitAndPush",
                        "Enable to use one interval for commit and another for sync."
                    ),
                    {
                        name: t("Auto {kind} interval (minutes)", { kind }),
                        desc: t(
                            "{kind} changes every X minutes. Set to 0 (default) to disable. (See below setting for further configuration!)",
                            { kind }
                        ),
                        control: {
                            type: "number",
                            key: "autoSaveInterval",
                            min: 0,
                            step: 1,
                            validate: validateInteger,
                        },
                    },
                    {
                        name: t("Auto {kind} after stopping file edits", {
                            kind,
                        }),
                        desc: t(
                            "Requires the {kind} interval not to be 0. If turned on, do auto {kind} every {n} minutes after stopping file edits. This also prevents auto {kind} while editing a file. If turned off, it's independent from the last file edit.",
                            { kind, n: this.settings.autoSaveInterval }
                        ),
                        control: {
                            type: "toggle",
                            key: "autoBackupAfterFileChange",
                            disabled: () =>
                                this.settings.setLastSaveToLastCommit,
                        },
                    },
                    {
                        name: t("Auto {kind} after latest commit", { kind }),
                        desc: t(
                            "If turned on, sets last auto {kind} timestamp to the latest commit timestamp. This reduces the frequency of auto {kind} when doing manual commits.",
                            { kind }
                        ),
                        control: {
                            type: "toggle",
                            key: "setLastSaveToLastCommit",
                            disabled: () =>
                                this.settings.autoBackupAfterFileChange,
                        },
                    },
                    {
                        name: t("Auto push interval (minutes)"),
                        desc: t(
                            "Push commits every X minutes. Set to 0 (default) to disable. Recommended: 30 minutes when enabled."
                        ),
                        control: {
                            type: "number",
                            key: "autoPushInterval",
                            min: 0,
                            step: 1,
                            validate: validateInteger,
                            disabled: () =>
                                !this.settings.differentIntervalCommitAndPush,
                        },
                    },
                    {
                        name: t("Auto pull interval (minutes)"),
                        desc: t(
                            "Pull changes every X minutes. Set to 0 (default) to disable. Recommended: 30 minutes when enabled."
                        ),
                        control: {
                            type: "number",
                            key: "autoPullInterval",
                            min: 0,
                            step: 1,
                            validate: validateInteger,
                        },
                    },
                    this.toggle(
                        t("Auto {kind} only staged files", { kind }),
                        "autoCommitOnlyStaged",
                        t(
                            "If turned on, only staged files are committed on {kind}. If turned off, all changed files are committed.",
                            { kind }
                        )
                    ),
                    this.toggle(
                        t("Specify custom commit message on auto {kind}", {
                            kind,
                        }),
                        "customMessageOnAutoBackup",
                        "You will get a pop up to specify your message."
                    ),
                    {
                        name: t("Commit message on auto {kind}", { kind }),
                        desc: t(
                            "Available placeholders: {{date}} (see below), {{hostname}} (see below), {{numFiles}} (number of changed files in the commit) and {{files}} (changed files in commit message)."
                        ),
                        control: {
                            type: "textarea",
                            key: "autoCommitMessage",
                            defaultValue: DEFAULT_SETTINGS.autoCommitMessage,
                            disabled: () =>
                                this.settings.customMessageOnAutoBackup,
                        },
                    },
                ],
            },
            {
                type: "page",
                name: t("Commit"),
                visible: ready,
                items: [
                    this.toggle(
                        "Stage all changes when nothing is staged",
                        "autoStageOnEmptyIndex",
                        "When using Commit with nothing staged, stage and commit all changes. Commit all changes and Commit-and-sync are unaffected."
                    ),
                    {
                        name: t("Commit message on manual commit"),
                        desc: t(
                            "Available placeholders: {{date}} (see below), {{hostname}} (see below), {{numFiles}} (number of changed files in the commit) and {{files}} (changed files in commit message). Leave empty to require manual input on each commit."
                        ),
                        render: (setting) => {
                            setting.addTextArea((text) => {
                                text.setValue(this.settings.commitMessage);
                                text.onChange(async (value) => {
                                    this.settings.commitMessage = value;
                                    await this.plugin.saveSettings();
                                });
                                setting.addButton((button) =>
                                    button
                                        .setIcon("reset")
                                        .setTooltip(
                                            t('Set to default: "{template}"', {
                                                template:
                                                    DEFAULT_SETTINGS.commitMessage,
                                            })
                                        )
                                        .onClick(() => {
                                            text.setValue(
                                                DEFAULT_SETTINGS.commitMessage
                                            );
                                            text.onChanged();
                                        })
                                );
                            });
                        },
                    },
                    {
                        name: t("Commit message script"),
                        desc: t(
                            "A script that is run using 'sh -c' to generate the commit message. May be used to generate commit messages using AI tools. Available placeholders: {{hostname}}, {{date}}."
                        ),
                        visible: () => Platform.isDesktopApp,
                        control: { type: "text", key: "commitMessageScript" },
                    },
                    {
                        name: t("{{date}} placeholder format"),
                        render: (setting) => {
                            setting.addMomentFormat((text) =>
                                text
                                    .setDefaultFormat(
                                        this.settings.commitDateFormat
                                    )
                                    .setValue(this.settings.commitDateFormat)
                                    .onChange(async (value) => {
                                        this.settings.commitDateFormat = value;
                                        await this.plugin.saveSettings();
                                    })
                            );
                            setting.descEl.createSpan({
                                text: t(
                                    ' Specify custom date format. E.g. "YYYY-MM-DD HH:mm:ss". See '
                                ),
                            });
                            setting.descEl.createEl("a", {
                                text: t("Moment.js documentation"),
                                href: FORMAT_STRING_REFERENCE_URL,
                                attr: { target: "_blank" },
                            });
                            setting.descEl.createSpan({
                                text: t(" for more formats."),
                            });
                        },
                    },
                    {
                        name: t("{{hostname}} placeholder replacement"),
                        desc: t(
                            "Specify custom hostname for every device. Defaults to the OS hostname if not set on desktop."
                        ),
                        render: (setting) => {
                            setting.addText((text) =>
                                text
                                    .setValue(
                                        this.plugin.localStorage.getHostname() ??
                                            ""
                                    )
                                    .onChange((value) =>
                                        this.plugin.localStorage.setHostname(
                                            value
                                        )
                                    )
                            );
                        },
                    },
                    {
                        name: t("Preview commit message"),
                        render: (setting) => {
                            setting.addButton((button) =>
                                button
                                    .setButtonText(t("Preview"))
                                    .onClick(async () => {
                                        const preview =
                                            await this.plugin.gitManager.formatCommitMessage(
                                                this.settings.commitMessage
                                            );
                                        new Notice(preview);
                                    })
                            );
                        },
                    },
                    this.toggle(
                        "List filenames affected by commit in the commit body",
                        "listChangedFilesInMessageBody"
                    ),
                ],
            },
            {
                type: "page",
                name: t("Pull Strategy"),
                visible: ready,
                items: [
                    {
                        type: "group",
                        heading: t("Pull"),
                        items: [
                            {
                                ...this.dropdown(
                                    "Pull strategy",
                                    "syncMethod",
                                    {
                                        merge: "Merge",
                                        rebase: "Rebase",
                                        reset: t(
                                            "Reset to remote (--keep; backs up local history, updates tracked files, and aborts if local changes would be overwritten)"
                                        ),
                                    },
                                    "Decide how to integrate commits from your remote branch into your local branch."
                                ),
                                visible: desktop,
                            },
                            {
                                ...this.dropdown(
                                    "Auto-stash changes when rebasing",
                                    "rebaseAutoStash",
                                    {
                                        enabled: "Enabled",
                                        disabled: "Disabled",
                                        "git-config": "Use Git configuration",
                                    },
                                    "Stash local changes before rebasing and restore them afterward. Restoring may produce conflicts."
                                ),
                                visible: () =>
                                    desktop() &&
                                    this.settings.syncMethod === "rebase",
                            },
                            this.dropdown(
                                "Merge strategy on conflicts",
                                "mergeStrategy",
                                {
                                    none: "None (git default)",
                                    ours: "Our changes",
                                    theirs: "Their changes",
                                },
                                "Decide how to solve conflicts when pulling remote changes. This can be used to favor your local changes or the remote changes automatically."
                            ),
                            this.toggle(
                                "Pull on startup",
                                "autoPullOnBoot",
                                "Automatically pull commits when Obsidian starts."
                            ),
                        ],
                    },
                    {
                        type: "group",
                        heading: t("Commit-and-sync"),
                        items: [
                            this.toggle(
                                "Push on commit-and-sync",
                                "pushOnCommitAndSync",
                                t(
                                    "Most of the time you want to push after committing. Turning this off turns a commit-and-sync action into {action} only. It will still be called commit-and-sync.",
                                    {
                                        action: t(
                                            this.settings.pullBeforePush
                                                ? "commit and pull"
                                                : "commit"
                                        ),
                                    }
                                )
                            ),
                            this.toggle(
                                "Pull on commit-and-sync",
                                "pullBeforePush",
                                t(
                                    "On commit-and-sync, pull commits as well. Turning this off turns a commit-and-sync action into {action} only.",
                                    {
                                        action: t(
                                            this.settings.disablePush
                                                ? "commit"
                                                : "commit and push"
                                        ),
                                    }
                                )
                            ),
                            {
                                ...this.toggle(
                                    "Squash commits before push",
                                    "squashCommitsBeforePush",
                                    "On commit-and-sync, squash all local unpushed commits into a single commit right before pushing. Keeps the remote history clean when committing often. Only unpushed commits are rewritten, so no force-push is needed."
                                ),
                                visible: desktop,
                            },
                        ],
                    },
                ],
            },
            {
                type: "page",
                name: t("Editor"),
                visible: () => ready() && desktop(),
                items: [
                    {
                        type: "group",
                        heading: t("Hunk management"),
                        items: [
                            this.toggle(
                                "Signs",
                                "hunks.showSigns",
                                "This allows you to see your changes right in your editor via colored markers and stage/reset/preview individual hunks."
                            ),
                            this.toggle(
                                "Hunk commands",
                                "hunks.hunkCommands",
                                "Adds commands to stage/reset individual Git diff hunks and navigate between them via 'Go to next/prev hunk' commands."
                            ),
                            this.dropdown(
                                "Status bar with summary of line changes",
                                "hunks.statusBar",
                                {
                                    disabled: "Disabled",
                                    colored: "Colored",
                                    monochrome: "Monochrome",
                                }
                            ),
                        ],
                    },
                    {
                        type: "page",
                        name: t("Line author information"),
                        page: () => new LineAuthorSettingsPage(this),
                    },
                ],
            },
            {
                type: "page",
                name: t("Views"),
                items: [
                    {
                        type: "group",
                        heading: t("Source control view"),
                        items: [
                            this.toggle(
                                "Automatically refresh source control view on file changes",
                                "refreshSourceControl",
                                "On slower machines this may cause lags. If so, just disable this option."
                            ),
                            {
                                name: t("Source control view refresh interval"),
                                desc: t(
                                    "Milliseconds to wait after file change before refreshing the Source Control View."
                                ),
                                control: {
                                    type: "number",
                                    key: "refreshSourceControlTimer",
                                    min: 500,
                                    step: 1,
                                    validate: validateInteger,
                                },
                            },
                        ],
                    },
                    {
                        type: "group",
                        heading: t("Diff view"),
                        items: [
                            {
                                ...this.dropdown(
                                    "Diff view style",
                                    "diffStyle",
                                    { split: "Split", git_unified: "Unified" },
                                    "Split mode creates an editable diff in the editor, which may differ from Git's diff."
                                ),
                                visible: desktop,
                            },
                            {
                                name: t(
                                    "Split diff computation time limit (ms)"
                                ),
                                desc: t(
                                    "Maximum milliseconds to compute a detailed split diff. Read-only diffs use ten times this value."
                                ),
                                visible: desktop,
                                control: {
                                    type: "number",
                                    key: "diffTimeout",
                                    min: 1,
                                    step: 1,
                                    validate: validateInteger,
                                },
                            },
                        ],
                    },
                    {
                        type: "group",
                        heading: t("History view"),
                        items: [
                            this.dropdown(
                                "Show Author",
                                "authorInHistoryView",
                                {
                                    hide: "Hide",
                                    full: "Full",
                                    initials: "Initials",
                                },
                                "Show the author of the commit in the history view."
                            ),
                            this.toggle(
                                "Show Date",
                                "dateInHistoryView",
                                "Show the date of the commit in the history view. The {{date}} placeholder format is used to display the date."
                            ),
                        ],
                    },
                ],
            },
            {
                type: "page",
                name: t("Notifications"),
                items: [
                    this.toggle(
                        "Show informational notifications",
                        "showInformationalNotifications",
                        "Show notices about Git operations. The status bar still shows updates when this is off."
                    ),
                    this.toggle(
                        "Show error notifications",
                        "showErrorNotices",
                        "Show error notices for Git operations."
                    ),
                    {
                        ...this.toggle(
                            "Show notifications when nothing changed",
                            "showNoChangesNotifications",
                            "Also notify when a commit or push finds no changes."
                        ),
                        visible: () => !this.settings.disablePopups,
                    },
                    this.toggle(
                        "Show status bar",
                        "showStatusBar",
                        "Obsidian must be restarted for the changes to take affect."
                    ),
                    this.toggle(
                        "File menu integration",
                        "showFileMenu",
                        "Add Stage, Unstage, and Add to .gitignore actions to the file menu."
                    ),
                    this.toggle(
                        "Show branch status bar",
                        "showBranchStatusBar",
                        "Obsidian must be restarted for the changes to take affect."
                    ),
                    this.toggle(
                        "Show the count of modified files in the status bar",
                        "changedFilesInStatusBar"
                    ),
                ],
            },
            {
                type: "page",
                name: t("Commit author"),
                items: [
                    {
                        name: t(
                            "Username on your git server. E.g. your username on GitHub"
                        ),
                        visible: mobile,
                        render: (setting) => {
                            setting.addText((text) =>
                                text
                                    .setValue(
                                        this.plugin.localStorage.getUsername() ??
                                            ""
                                    )
                                    .onChange((value) =>
                                        this.plugin.localStorage.setUsername(
                                            value
                                        )
                                    )
                            );
                        },
                    },
                    {
                        name: t("Password/Personal access token"),
                        desc: t(
                            "Select or create a secret stored on this device for this vault."
                        ),
                        visible: mobile,
                        render: (setting) => {
                            setting.addComponent((el) =>
                                new SecretComponent(this.app, el)
                                    .setValue(
                                        this.settings.gitServerPasswordSecret
                                    )
                                    .onChange(async (value) => {
                                        this.settings.gitServerPasswordSecret =
                                            value ?? "";
                                        await this.plugin.saveSettings();
                                    })
                            );
                        },
                    },
                    {
                        name: t("Author name for commit"),
                        desc: t(
                            Platform.isDesktopApp
                                ? "Changes only this repository's Git config. Leave blank to use the global author name, if configured."
                                : "Saved in this repository's Git config. Mobile Git has no global author name fallback."
                        ),
                        visible: ready,
                        render: (setting) =>
                            this.renderRepositoryAuthor(setting, "user.name"),
                    },
                    {
                        name: t("Author email for commit"),
                        desc: t(
                            Platform.isDesktopApp
                                ? "Changes only this repository's Git config. Leave blank to use the global author email, if configured."
                                : "Saved in this repository's Git config. Mobile Git has no global author email fallback."
                        ),
                        visible: ready,
                        render: (setting) =>
                            this.renderRepositoryAuthor(setting, "user.email"),
                    },
                ],
            },
            {
                type: "page",
                name: t("Advanced"),
                items: [
                    {
                        ...this.toggle(
                            "Update submodules",
                            "updateSubmodules",
                            '"Commit-and-sync" and "pull" takes care of submodules. Missing features: Conflicted files, count of pulled/pushed/committed files. Tracking branch needs to be set for each submodule.'
                        ),
                        visible: desktop,
                    },
                    {
                        ...this.toggle(
                            "Submodule recurse checkout/switch",
                            "submoduleRecurseCheckout",
                            "Whenever a checkout happens on the root repository, recurse the checkout on the submodules (if the branches exist)."
                        ),
                        visible: () =>
                            desktop() && this.settings.updateSubmodules,
                    },
                    this.toggle(
                        "Limit file operations to the vault",
                        "limitToVault",
                        "Limit status, staging, unstaging, discarding, and submodule updates to the vault where possible. Repository history and remote actions remain repository-wide."
                    ),
                    {
                        name: t("Custom Git binary path"),
                        desc: t(
                            "Specify the path to the Git binary/executable. Git should already be in your PATH. Should only be necessary for a custom Git installation."
                        ),
                        visible: desktop,
                        render: (setting) => {
                            setting.addText((text) =>
                                text
                                    .setPlaceholder("git")
                                    .setValue(
                                        this.plugin.localStorage.getGitPath() ??
                                            ""
                                    )
                                    .onChange((value) => {
                                        void this.plugin.changeGitPath(value);
                                    })
                            );
                        },
                    },
                    {
                        name: t("Additional environment variables"),
                        desc: t(
                            "Use each line for a new environment variable in the format KEY=VALUE ."
                        ),
                        visible: desktop,
                        render: (setting) => {
                            setting.addTextArea((text) =>
                                text
                                    .setPlaceholder("GIT_DIR=/path/to/git/dir")
                                    .setValue(
                                        this.plugin.localStorage
                                            .getEnvVars()
                                            .join("\n")
                                    )
                                    .onChange((value) =>
                                        this.plugin.localStorage.setEnvVars(
                                            value.split("\n")
                                        )
                                    )
                            );
                        },
                    },
                    {
                        name: t("Additional PATH environment variable paths"),
                        desc: t("Use each line for one path"),
                        visible: desktop,
                        render: (setting) => {
                            setting.addTextArea((text) =>
                                text
                                    .setValue(
                                        this.plugin.localStorage
                                            .getPATHPaths()
                                            .join("\n")
                                    )
                                    .onChange((value) =>
                                        this.plugin.localStorage.setPATHPaths(
                                            value.split("\n")
                                        )
                                    )
                            );
                        },
                    },
                    {
                        name: t("Reload with new environment variables"),
                        desc: t(
                            "Removing previously added environment variables will not take effect until Obsidian is restarted."
                        ),
                        visible: desktop,
                        render: (setting) => {
                            setting.addButton((button) =>
                                button
                                    .setButtonText(t("Reload"))
                                    .setCta()
                                    .onClick(async () => {
                                        await this.plugin.reloadGitManager();
                                    })
                            );
                        },
                    },
                    {
                        name: t("Custom base path (Git repository path)"),
                        desc: t(
                            'Sets the relative path to the vault from which the Git binary should be executed. Mostly used to set the path to the Git repository, which is only required if the Git repository is below the vault root directory. Use "\\" instead of "/" on Windows.'
                        ),
                        control: {
                            type: "folder",
                            key: "basePath",
                            includeRoot: false,
                            validate: (path) => {
                                if (path === "") return undefined;
                                if (path === "/")
                                    return t(
                                        "Leave empty when the repository is at the root."
                                    );
                                if (!this.app.vault.getFolderByPath(path))
                                    return t(
                                        "Choose an existing folder in this vault."
                                    );
                                return undefined;
                            },
                        },
                    },
                    {
                        name: t(
                            "Custom Git directory path (Instead of '.git')"
                        ),
                        desc: t(
                            'Corresponds to the GIT_DIR environment variable. Relative paths are resolved from the custom base path, or the vault root when no base path is configured. Requires restart of Obsidian to take effect. Use "\\" instead of "/" on Windows.'
                        ),
                        control: {
                            type: "text",
                            key: "gitDir",
                            placeholder: ".git",
                        },
                    },
                    {
                        name: t("Disable on this device"),
                        desc: t(
                            "Disables the plugin on this device. This setting is not synced."
                        ),
                        render: (setting) => {
                            setting.addToggle((toggle) =>
                                toggle
                                    .setValue(
                                        this.plugin.localStorage.getPluginDisabled()
                                    )
                                    .onChange((value) => {
                                        this.plugin.localStorage.setPluginDisabled(
                                            value
                                        );
                                        if (value) this.plugin.unloadPlugin();
                                        else
                                            this.plugin
                                                .init({ fromReload: true })
                                                .catch((error) =>
                                                    this.plugin.displayError(
                                                        error
                                                    )
                                                );
                                        new Notice(
                                            t(
                                                "Obsidian must be restarted for the changes to take affect."
                                            )
                                        );
                                    })
                            );
                        },
                    },
                    {
                        type: "group",
                        heading: t("Debugging and logging"),
                        items: [
                            {
                                name: t("Copy Debug Information"),
                                desc: t(
                                    "Copies only boolean and numeric settings; excludes credentials, paths, and custom text."
                                ),
                                render: (setting) => {
                                    setting.addButton((button) =>
                                        button
                                            .setButtonText(t("Copy"))
                                            .onClick(async () => {
                                                await window.navigator.clipboard.writeText(
                                                    JSON.stringify(
                                                        {
                                                            // 仅允许无文本的配置值，避免凭据、路径和模板进入支持信息。
                                                            settings:
                                                                Object.fromEntries(
                                                                    Object.entries(
                                                                        this
                                                                            .settings
                                                                    ).filter(
                                                                        ([
                                                                            ,
                                                                            value,
                                                                        ]) =>
                                                                            typeof value ===
                                                                                "boolean" ||
                                                                            typeof value ===
                                                                                "number"
                                                                    )
                                                                ),
                                                            pluginVersion:
                                                                this.plugin
                                                                    .manifest
                                                                    .version,
                                                        },
                                                        null,
                                                        4
                                                    )
                                                );
                                                new Notice(
                                                    t(
                                                        "Sanitized debug information copied to clipboard."
                                                    )
                                                );
                                            })
                                    );
                                },
                            },
                            {
                                name: t("Debugging and logging"),
                                desc: t(
                                    "Open the developer console with {shortcut}.",
                                    {
                                        shortcut: Platform.isMacOS
                                            ? "CMD (⌘) + OPTION (⌥) + I"
                                            : "CTRL + SHIFT + I",
                                    }
                                ),
                                visible: () => Platform.isDesktopApp,
                            },
                        ],
                    },
                ],
            },
            {
                heading: t("Support"),
                type: "group",
                items: [
                    {
                        name: t("Donate"),
                        desc: t("Support continued development of the plugin."),
                        render: (setting) => {
                            setting.addButton((button) =>
                                button
                                    .setButtonText(t("Donate"))
                                    .onClick(() =>
                                        window.open(
                                            "https://ko-fi.com/F1F195IQ5"
                                        )
                                    )
                            );
                        },
                    },
                ],
            },
        ];
    }

    public configureLineAuthorShowStatus(show: boolean) {
        this.settings.lineAuthor.show = show;
        void this.plugin.saveSettings();

        if (show) this.plugin.editorIntegration.activateLineAuthoring();
        else this.plugin.editorIntegration.deactiveLineAuthoring();
    }

    /** 保存设置并刷新行作者视图。 */
    public async lineAuthorSettingHandler<
        K extends keyof ObsidianGitSettings["lineAuthor"],
    >(key: K, value: ObsidianGitSettings["lineAuthor"][K]): Promise<void> {
        this.settings.lineAuthor[key] = value;
        await this.plugin.saveSettings();
        this.plugin.editorIntegration.lineAuthoringFeature.refreshLineAuthorViews();
    }

    /** 保留上次显示方式，供行作者信息的上下文菜单恢复使用。 */
    public beforeSaveSettings() {
        const laSettings = this.settings.lineAuthor;
        if (laSettings.authorDisplay !== "hide") {
            laSettings.lastShownAuthorDisplay = laSettings.authorDisplay;
        }
        if (laSettings.dateTimeFormatOptions !== "hide") {
            laSettings.lastShownDateTimeFormatOptions =
                laSettings.dateTimeFormatOptions;
        }
    }

    public renderLineAuthorSettings(containerEl: HTMLElement): void {
        containerEl.empty();
        this.lineAuthorColorSettings.clear();
        const baseLineAuthorInfoSetting = new Setting(containerEl).setName(
            t("Show commit authoring information next to each line")
        );

        if (
            !this.plugin.editorIntegration.lineAuthoringFeature.isAvailableOnCurrentPlatform()
        ) {
            baseLineAuthorInfoSetting
                .setDesc(t("Only available on desktop currently."))
                .setDisabled(true);
        }

        baseLineAuthorInfoSetting.descEl.createEl("a", {
            href: LINE_AUTHOR_FEATURE_WIKI_LINK,
            text: t("Feature guide and quick examples"),
            attr: { target: "_blank" },
        });
        baseLineAuthorInfoSetting.descEl.createEl("br");
        baseLineAuthorInfoSetting.descEl.createSpan({
            text: t(
                " The commit hash, author name and authoring date can all be individually toggled."
            ),
        });
        baseLineAuthorInfoSetting.descEl.createEl("br");
        baseLineAuthorInfoSetting.descEl.createSpan({
            text: t("Hide everything, to only show the age-colored sidebar."),
        });

        baseLineAuthorInfoSetting.addToggle((toggle) =>
            toggle.setValue(this.settings.lineAuthor.show).onChange((value) => {
                this.configureLineAuthorShowStatus(value);
                this.refreshLineAuthorPage(containerEl);
            })
        );

        if (this.settings.lineAuthor.show) {
            const trackMovement = new Setting(containerEl)
                .setName(
                    t("Follow movement and copies across files and commits")
                )
                .addDropdown((dropdown) => {
                    dropdown.addOptions({
                        inactive: t("Do not follow (default)"),
                        "same-commit": t("Follow within same commit"),
                        "all-commits": t(
                            "Follow within all commits (maybe slow)"
                        ),
                    });
                    dropdown.setValue(this.settings.lineAuthor.followMovement);
                    dropdown.onChange((value) =>
                        this.lineAuthorSettingHandler(
                            "followMovement",
                            value as LineAuthorFollowMovement
                        )
                    );
                });

            trackMovement.descEl.createSpan({
                text: t(
                    "By default (deactivated), each line only shows the newest commit where it was changed."
                ),
            });
            trackMovement.descEl.createEl("br");
            trackMovement.descEl.createSpan({ text: t("With ") });
            trackMovement.descEl.createEl("i", { text: t("same commit") });
            trackMovement.descEl.createSpan({
                text: t(
                    ", cut-copy-paste-ing of text is followed within the same commit and the original commit of authoring will be shown."
                ),
            });
            trackMovement.descEl.createEl("br");
            trackMovement.descEl.createSpan({ text: t("With ") });
            trackMovement.descEl.createEl("i", { text: t("all commits") });
            trackMovement.descEl.createSpan({
                text: t(
                    ", cut-copy-paste-ing text inbetween multiple commits will be detected."
                ),
            });
            trackMovement.descEl.createEl("br");
            trackMovement.descEl.createSpan({ text: t("It uses ") });
            trackMovement.descEl.createEl("a", {
                href: "https://git-scm.com/docs/git-blame",
                text: "git-blame",
                attr: { target: "_blank" },
            });
            trackMovement.descEl.createSpan({
                text: t(
                    " and for matches (at least {n} characters) within the same (or all) commit(s), ",
                    { n: GIT_LINE_AUTHORING_MOVEMENT_DETECTION_MINIMAL_LENGTH }
                ),
            });
            trackMovement.descEl.createEl("em", { text: t("the originating") });
            trackMovement.descEl.createSpan({
                text: t(" commit's information is shown."),
            });

            new Setting(containerEl)
                .setName(t("Show commit hash"))
                .addToggle((toggle) => {
                    toggle.setValue(this.settings.lineAuthor.showCommitHash);
                    toggle.onChange((value) =>
                        this.lineAuthorSettingHandler("showCommitHash", value)
                    );
                });

            new Setting(containerEl)
                .setName(t("Author name display"))
                .setDesc(t("If and how the author is displayed"))
                .addDropdown((dropdown) => {
                    const options: Record<LineAuthorDisplay, string> = {
                        hide: t("Hide"),
                        initials: t("Initials (default)"),
                        "first name": t("First name"),
                        "last name": t("Last name"),
                        full: t("Full name"),
                    };
                    dropdown.addOptions(options);
                    dropdown.setValue(this.settings.lineAuthor.authorDisplay);
                    dropdown.onChange((value) =>
                        this.lineAuthorSettingHandler(
                            "authorDisplay",
                            value as LineAuthorDisplay
                        )
                    );
                });

            new Setting(containerEl)
                .setName(t("Authoring date display"))
                .setDesc(
                    t(
                        "If and how the date and time of authoring the line is displayed"
                    )
                )
                .addDropdown((dropdown) => {
                    const options: Record<
                        LineAuthorDateTimeFormatOptions,
                        string
                    > = {
                        hide: t("Hide"),
                        date: t("Date (default)"),
                        datetime: t("Date and time"),
                        "natural language": t("Natural language"),
                        custom: t("Custom"),
                    };
                    dropdown.addOptions(options);
                    dropdown.setValue(
                        this.settings.lineAuthor.dateTimeFormatOptions
                    );
                    dropdown.onChange(async (value) => {
                        await this.lineAuthorSettingHandler(
                            "dateTimeFormatOptions",
                            value as LineAuthorDateTimeFormatOptions
                        );
                        this.refreshLineAuthorPage(containerEl);
                    });
                });

            if (this.settings.lineAuthor.dateTimeFormatOptions === "custom") {
                const dateTimeFormatCustomStringSetting = new Setting(
                    containerEl
                );
                dateTimeFormatCustomStringSetting
                    .setName(t("Custom authoring date format"))
                    .addText((text) => {
                        text.setValue(
                            this.settings.lineAuthor.dateTimeFormatCustomString
                        );
                        text.setPlaceholder("YYYY-MM-DD HH:mm");
                        text.onChange(async (value) => {
                            await this.lineAuthorSettingHandler(
                                "dateTimeFormatCustomString",
                                value
                            );
                            this.setCustomDateTimeDescription(
                                dateTimeFormatCustomStringSetting.descEl,
                                value
                            );
                        });
                    });
                this.setCustomDateTimeDescription(
                    dateTimeFormatCustomStringSetting.descEl,
                    this.settings.lineAuthor.dateTimeFormatCustomString
                );
            }

            const timezoneSetting = new Setting(containerEl)
                .setName(t("Authoring date display timezone"))
                .addDropdown((dropdown) => {
                    const options: Record<LineAuthorTimezoneOption, string> = {
                        "viewer-local": t("My local (default)"),
                        "author-local": t("Author's local"),
                        utc0000: "UTC+0000/Z",
                    };
                    dropdown.addOptions(options);
                    dropdown.setValue(
                        this.settings.lineAuthor.dateTimeTimezone
                    );
                    dropdown.onChange((value) =>
                        this.lineAuthorSettingHandler(
                            "dateTimeTimezone",
                            value as LineAuthorTimezoneOption
                        )
                    );
                });
            timezoneSetting.descEl.empty();
            timezoneSetting.descEl.createSpan({
                text: t(
                    "The time-zone in which the authoring date should be shown.\nEither your local time-zone (default),\nthe author's time-zone during commit creation or\n"
                ),
            });
            timezoneSetting.descEl.createEl("a", {
                text: t("UTC±00:00"),
                href: "https://en.wikipedia.org/wiki/UTC%C2%B100:00",
            });
            timezoneSetting.descEl.createSpan({ text: t(".") });

            const oldestAgeSetting = new Setting(containerEl).setName(
                t("Oldest age in coloring")
            );
            this.setOldestAgeDescription(
                oldestAgeSetting.descEl,
                this.settings.lineAuthor.coloringMaxAge
            );
            oldestAgeSetting.addText((text) => {
                text.setPlaceholder("1y");
                text.setValue(this.settings.lineAuthor.coloringMaxAge);
                text.onChange(async (value) => {
                    const duration = parseColoringMaxAgeDuration(value);
                    this.setOldestAgeDescription(
                        oldestAgeSetting.descEl,
                        value
                    );
                    if (duration !== undefined) {
                        await this.lineAuthorSettingHandler(
                            "coloringMaxAge",
                            value
                        );
                        this.refreshColorSettingsName("oldest");
                    }
                });
            });

            this.createColorSetting("newest", containerEl);
            this.createColorSetting("oldest", containerEl);

            const textColorSetting = new Setting(containerEl)
                .setName(t("Text color"))
                .addText((field) => {
                    field.setValue(this.settings.lineAuthor.textColorCss);
                    field.onChange((value) =>
                        this.lineAuthorSettingHandler("textColorCss", value)
                    );
                });
            textColorSetting.descEl.empty();
            textColorSetting.descEl.createSpan({
                text: t("The CSS color of the gutter text."),
            });
            textColorSetting.descEl.createEl("br");
            textColorSetting.descEl.createEl("br");
            textColorSetting.descEl.createSpan({
                text: t("It is highly recommended to use "),
            });
            textColorSetting.descEl.createEl("a", {
                text: t("CSS variables"),
                href: "https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties",
            });
            textColorSetting.descEl.createSpan({
                text: t(" defined by themes (e.g. "),
            });
            textColorSetting.descEl.createEl("pre", {
                text: "var(--text-muted)",
                attr: { style: "display:inline" },
            });
            textColorSetting.descEl.createSpan({ text: t(" or ") });
            textColorSetting.descEl.createEl("pre", {
                text: "var(--text-on-accent)",
                attr: { style: "display:inline" },
            });
            textColorSetting.descEl.createSpan({
                text: t(
                    "), because they automatically adapt to theme changes."
                ),
            });
            textColorSetting.descEl.createEl("br");
            textColorSetting.descEl.createEl("br");
            textColorSetting.descEl.createSpan({ text: t("See: ") });
            textColorSetting.descEl.createEl("a", {
                text: t("List of available CSS variables in Obsidian"),
                href: "https://github.com/obsidian-community/obsidian-theme-template/blob/main/obsidian.css",
            });

            const ignoreWhitespaceSetting = new Setting(containerEl)
                .setName(t("Ignore whitespace and newlines in changes"))
                .addToggle((toggle) => {
                    toggle.setValue(this.settings.lineAuthor.ignoreWhitespace);
                    toggle.onChange((value) =>
                        this.lineAuthorSettingHandler("ignoreWhitespace", value)
                    );
                });
            ignoreWhitespaceSetting.descEl.empty();
            ignoreWhitespaceSetting.descEl.createSpan({
                text: t(
                    "Whitespace and newlines are interpreted as part of the document and in changes by default (hence not ignored). This makes the last line being shown as 'changed' when a new subsequent line is added, even if the previously last line's text is the same."
                ),
            });
            ignoreWhitespaceSetting.descEl.createEl("br");
            ignoreWhitespaceSetting.descEl.createSpan({
                text: t(
                    "If you don't care about purely-whitespace changes (e.g. list nesting / quote indentation changes), then activating this will provide more meaningful change detection."
                ),
            });
        }
    }

    private createColorSetting(
        which: "oldest" | "newest",
        containerEl: HTMLElement
    ) {
        const setting = new Setting(containerEl).setName("").addText((text) => {
            const color = pickColor(which, this.settings.lineAuthor);
            const defaultColor = pickColor(which, DEFAULT_SETTINGS.lineAuthor);
            text.setPlaceholder(rgbToString(defaultColor));
            text.setValue(rgbToString(color));
            text.onChange(async (colorNew) => {
                const rgb = convertToRgb(colorNew);
                if (rgb !== undefined) {
                    const key = which === "newest" ? "colorNew" : "colorOld";
                    await this.lineAuthorSettingHandler(key, rgb);
                }
                this.refreshColorSettingsDesc(which, rgb);
            });
        });
        this.lineAuthorColorSettings.set(which, setting);
        this.refreshColorSettingsName(which);
        this.refreshColorSettingsDesc(
            which,
            pickColor(which, this.settings.lineAuthor)
        );
    }

    private refreshColorSettingsName(which: "oldest" | "newest") {
        const settingsDom = this.lineAuthorColorSettings.get(which);
        if (settingsDom) {
            const whichDescriber =
                which === "oldest"
                    ? t("oldest ({age} or older)", {
                          age: this.settings.lineAuthor.coloringMaxAge,
                      })
                    : t("newest");
            settingsDom.nameEl.setText(
                t("Color for {which} commits", { which: whichDescriber })
            );
        }
    }

    private refreshColorSettingsDesc(which: "oldest" | "newest", rgb?: RGB) {
        const settingsDom = this.lineAuthorColorSettings.get(which);
        if (settingsDom) {
            this.colorSettingPreviewDesc(
                settingsDom.descEl,
                which,
                this.settings.lineAuthor,
                rgb !== undefined
            );
        }
    }

    private colorSettingPreviewDesc(
        descEl: HTMLElement,
        which: "oldest" | "newest",
        laSettings: LineAuthorSettings,
        colorIsValid: boolean
    ): void {
        descEl.empty();
        descEl.createSpan({
            text: t(
                "Supports 'rgb(r,g,b)', 'hsl(h,s,l)', hex (#) and named colors (e.g. 'black', 'purple'). Color preview: "
            ),
        });
        const rgbStr = colorIsValid
            ? previewColor(which, laSettings)
            : "rgba(127,127,127,0.3)";
        const today = moment.unix(moment.now() / 1000).format("YYYY-MM-DD");
        const text = colorIsValid
            ? t("abcdef Author Name {date}", { date: today })
            : t("invalid color");
        descEl.createEl("div", {
            text,
            attr: {
                class: "line-author-settings-preview",
                style: `background-color: ${rgbStr}; width: 30ch;`,
            },
        });
    }

    private setCustomDateTimeDescription(
        descEl: HTMLElement,
        dateTimeFormatCustomString: string
    ): void {
        descEl.empty();
        descEl.createEl("a", {
            text: t("Format string"),
            href: FORMAT_STRING_REFERENCE_URL,
        });
        descEl.createSpan({ text: t(" to display the authoring date.") });
        descEl.createEl("br");
        descEl.createSpan({
            text: t("Currently: {datetime}", {
                datetime: moment().format(dateTimeFormatCustomString),
            }),
        });
    }

    private setOldestAgeDescription(
        descEl: HTMLElement,
        coloringMaxAge: string
    ): void {
        const duration = parseColoringMaxAgeDuration(coloringMaxAge);
        const durationString =
            duration !== undefined
                ? `${duration.asDays()}${t(" days")}`
                : t("invalid!");
        descEl.empty();
        descEl.createSpan({
            text: t(
                'The oldest age in the line author coloring. Everything older will have the same color.\nSmallest valid age is "1d". Currently: {duration}',
                { duration: durationString }
            ),
        });
    }

    private refreshLineAuthorPage(containerEl: HTMLElement): void {
        window.clearTimeout(this.lineAuthorRefreshTimer);
        this.lineAuthorRefreshTimer = window.setTimeout(() => {
            this.lineAuthorRefreshTimer = undefined;
            if (containerEl.isConnected)
                this.renderLineAuthorSettings(containerEl);
        }, 80);
    }

    public cancelLineAuthorRefresh(): void {
        window.clearTimeout(this.lineAuthorRefreshTimer);
        this.lineAuthorRefreshTimer = undefined;
        this.lineAuthorColorSettings.clear();
    }
}

// 行作者子页保留实时颜色和日期预览，外层导航使用声明式 API。
class LineAuthorSettingsPage extends SettingPage {
    title = t("Line author information");

    constructor(private tab: ObsidianGitSettingsTab) {
        super();
    }

    display(): void {
        this.tab.renderLineAuthorSettings(this.containerEl);
    }

    hide(): void {
        this.tab.cancelLineAuthorRefresh();
        super.hide();
    }
}

export function pickColor(
    which: "oldest" | "newest",
    las: LineAuthorSettings
): RGB {
    return which === "oldest" ? las.colorOld : las.colorNew;
}

export function parseColoringMaxAgeDuration(
    durationString: string
): moment.Duration | undefined {
    // https://momentjs.com/docs/#/durations/creating/
    const duration = moment.duration("P" + durationString.toUpperCase());
    return duration.isValid() && duration.asDays() && duration.asDays() >= 1
        ? duration
        : undefined;
}
