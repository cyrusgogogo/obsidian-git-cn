import type { App, RGB, TextComponent } from "obsidian";
import {
    moment,
    Notice,
    Platform,
    PluginSettingTab,
    Setting,
    TextAreaComponent,
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
import type {
    ObsidianGitSettings,
    MergeStrategy,
    ShowAuthorInHistoryView,
    SyncMethod,
} from "src/types";
import { convertToRgb, rgbToString } from "src/utils";

const FORMAT_STRING_REFERENCE_URL =
    "https://momentjs.com/docs/#/parsing/string-format/";
const LINE_AUTHOR_FEATURE_WIKI_LINK =
    "https://publish.obsidian.md/git-doc/Line+Authoring";
const AUTHENTICATION_GUIDE_URL =
    "https://raw.githubusercontent.com/cyrusgogogo/obsidian-git-cn/master/docs/Authentication.zh.md";

export class ObsidianGitSettingsTab extends PluginSettingTab {
    lineAuthorColorSettings: Map<"oldest" | "newest", Setting> = new Map();
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

    display(): void {
        const { containerEl } = this;
        const plugin: ObsidianGit = this.plugin;

        let commitOrSync: string;
        if (plugin.settings.differentIntervalCommitAndPush) {
            commitOrSync = "commit";
        } else {
            commitOrSync = "commit-and-sync";
        }

        const gitReady = plugin.gitReady;

        containerEl.empty();

        new Setting(containerEl)
            .setName(t("Language"))
            .setDesc(t("Display language of the plugin interface."))
            .addDropdown((dropdown) =>
                dropdown
                    .addOption("zh", "中文")
                    .addOption("en", "English")
                    .setValue(plugin.settings.language)
                    .onChange(async (value) => {
                        plugin.settings.language = parseLocale(value);
                        setLocale(plugin.settings.language);
                        await plugin.saveSettings();
                        this.refreshDisplayWithDelay();
                    })
            );

        if (!gitReady) {
            containerEl.createEl("p", {
                text: t(
                    "Git is not ready. When all settings are correct you can configure commit-sync, etc."
                ),
            });
            containerEl.createEl("br");
        }

        // ===== 仓库与远端 =====
        new Setting(containerEl).setName(t("Repository & Remote")).setHeading();

        new Setting(containerEl)
            .setName(t("Initialize repository"))
            .setDesc(
                t(
                    "Create a Git repository for this vault and an initial commit."
                )
            )
            .addButton((button) =>
                button.setButtonText(t("Initialize repository")).onClick(() => {
                    plugin.createNewRepo().catch((e) => plugin.displayError(e));
                })
            );

        new Setting(containerEl)
            .setName(t("Clone repository"))
            .setDesc(t("Clone an existing remote repository into this vault."))
            .addButton((button) =>
                button.setButtonText(t("Clone repository")).onClick(() => {
                    plugin.cloneNewRepo().catch((e) => plugin.displayError(e));
                })
            );

        const remoteSetting = new Setting(containerEl)
            .setName(t("Remote"))
            .setDesc(t("No remote configured"))
            .addButton((button) =>
                button.setButtonText(t("Manage remotes")).onClick(() => {
                    plugin
                        .editRemotes()
                        .catch((e) => plugin.displayError(e))
                        .finally(() => this.refreshDisplayWithDelay());
                })
            );
        if (plugin.gitReady) {
            void plugin.gitManager
                .getRemotes()
                .then(async (remotes) => {
                    if (remotes.length > 0) {
                        const urls = await Promise.all(
                            remotes.map((name) =>
                                plugin.gitManager.getRemoteUrl(name)
                            )
                        );
                        remoteSetting.descEl.setText(
                            remotes
                                .map(
                                    (name, index) =>
                                        `${name}: ${urls[index] ?? ""}`
                                )
                                .join("\n")
                        );
                    }
                })
                .catch(() => undefined);
        }

        new Setting(containerEl)
            .setName(t("Authentication"))
            .setDesc(
                t(
                    "Credentials are handled by the system Git credential helper; the plugin never stores passwords."
                )
            )
            .addButton((button) =>
                button
                    .setButtonText(t("Open guide"))
                    .onClick(() => window.open(AUTHENTICATION_GUIDE_URL))
            );

        new Setting(containerEl)
            .setName(t("Custom base path (Git repository path)"))
            .setDesc(
                t(
                    'Sets the relative path to the vault from which the Git binary should be executed. Mostly used to set the path to the Git repository, which is only required if the Git repository is below the vault root directory. Use "\\" instead of "/" on Windows.'
                )
            )
            .addText((cb) => {
                cb.setValue(plugin.settings.basePath);
                cb.setPlaceholder("directory/directory-with-git-repo");
                cb.onChange(async (value) => {
                    plugin.settings.basePath = value;
                    await plugin.saveSettings();
                    plugin.gitManager
                        .updateBasePath(value || "")
                        .catch((e) => plugin.displayError(e));
                });
            });

        new Setting(containerEl)
            .setName(t("Custom Git directory path (Instead of '.git')"))
            .setDesc(
                t(
                    'Corresponds to the GIT_DIR environment variable. Relative paths are resolved from the custom base path, or the vault root when no base path is configured. Requires restart of Obsidian to take effect. Use "\\" instead of "/" on Windows.'
                )
            )
            .addText((cb) => {
                cb.setValue(plugin.settings.gitDir);
                cb.setPlaceholder(".git");
                cb.onChange(async (value) => {
                    plugin.settings.gitDir = value;
                    await plugin.saveSettings();
                });
            });

        if (plugin.gitManager instanceof SimpleGit) {
            new Setting(containerEl)
                .setName(t("Update submodules"))
                .setDesc(
                    t(
                        '"Commit-and-sync" and "pull" takes care of submodules. Missing features: Conflicted files, count of pulled/pushed/committed files. Tracking branch needs to be set for each submodule.'
                    )
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.updateSubmodules)
                        .onChange(async (value) => {
                            plugin.settings.updateSubmodules = value;
                            await plugin.saveSettings();
                            this.refreshDisplayWithDelay();
                        })
                );
            if (plugin.settings.updateSubmodules) {
                new Setting(containerEl)
                    .setName(t("Submodule recurse checkout/switch"))
                    .setDesc(
                        t(
                            "Whenever a checkout happens on the root repository, recurse the checkout on the submodules (if the branches exist)."
                        )
                    )
                    .addToggle((toggle) =>
                        toggle
                            .setValue(plugin.settings.submoduleRecurseCheckout)
                            .onChange(async (value) => {
                                plugin.settings.submoduleRecurseCheckout =
                                    value;
                                await plugin.saveSettings();
                            })
                    );
            }
        }

        if (plugin.gitManager instanceof SimpleGit)
            new Setting(containerEl)
                .setName(t("Custom Git binary path"))
                .setDesc(
                    t(
                        "Specify the path to the Git binary/executable. Git should already be in your PATH. Should only be necessary for a custom Git installation."
                    )
                )
                .addText((cb) => {
                    cb.setValue(plugin.localStorage.getGitPath() ?? "");
                    cb.setPlaceholder("git");
                    cb.onChange((value) => {
                        plugin.localStorage.setGitPath(value);
                        plugin.gitManager
                            .updateGitPath(value || "git")
                            .catch((e) => plugin.displayError(e));
                    });
                });

        if (plugin.gitManager instanceof SimpleGit)
            new Setting(containerEl)
                .setName(t("Additional environment variables"))
                .setDesc(
                    t(
                        "Use each line for a new environment variable in the format KEY=VALUE ."
                    )
                )
                .addTextArea((cb) => {
                    cb.setPlaceholder("GIT_DIR=/path/to/git/dir");
                    cb.setValue(plugin.localStorage.getEnvVars().join("\n"));
                    cb.onChange((value) => {
                        plugin.localStorage.setEnvVars(value.split("\n"));
                    });
                });

        if (plugin.gitManager instanceof SimpleGit)
            new Setting(containerEl)
                .setName(t("Additional PATH environment variable paths"))
                .setDesc(t("Use each line for one path"))
                .addTextArea((cb) => {
                    cb.setValue(plugin.localStorage.getPATHPaths().join("\n"));
                    cb.onChange((value) => {
                        plugin.localStorage.setPATHPaths(value.split("\n"));
                    });
                });

        if (plugin.gitManager instanceof SimpleGit)
            new Setting(containerEl)
                .setName(t("Reload with new environment variables"))
                .setDesc(
                    t(
                        "Removing previously added environment variables will not take effect until Obsidian is restarted."
                    )
                )
                .addButton((cb) => {
                    cb.setButtonText(t("Reload"));
                    cb.setCta();
                    cb.onClick(async () => {
                        await (plugin.gitManager as SimpleGit).setGitInstance();
                    });
                });

        if (gitReady) {
            // ===== 同步触发 =====
            new Setting(containerEl).setName(t("Sync Triggers")).setHeading();

            let setting: Setting;

            new Setting(containerEl)
                .setName(t("Split timers for automatic commit and sync"))
                .setDesc(
                    t(
                        "Enable to use one interval for commit and another for sync."
                    )
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(
                            plugin.settings.differentIntervalCommitAndPush
                        )
                        .onChange(async (value) => {
                            plugin.settings.differentIntervalCommitAndPush =
                                value;
                            await plugin.saveSettings();
                            plugin.automaticsManager.reload("commit", "push");
                            this.refreshDisplayWithDelay();
                        })
                );

            new Setting(containerEl)
                .setName(
                    t("Auto {kind} interval (minutes)", {
                        kind: t(commitOrSync),
                    })
                )
                .setDesc(
                    t(
                        "{kind} changes every X minutes. Set to 0 (default) to disable. (See below setting for further configuration!)",
                        { kind: t(commitOrSync) }
                    )
                )
                .addText((text) => {
                    text.inputEl.type = "number";
                    this.setNonDefaultValue({
                        text,
                        settingsProperty: "autoSaveInterval",
                    });
                    text.setPlaceholder(
                        String(DEFAULT_SETTINGS.autoSaveInterval)
                    );
                    text.onChange(async (value) => {
                        if (value !== "") {
                            plugin.settings.autoSaveInterval = Number(value);
                        } else {
                            plugin.settings.autoSaveInterval =
                                DEFAULT_SETTINGS.autoSaveInterval;
                        }
                        await plugin.saveSettings();
                        plugin.automaticsManager.reload("commit");
                    });
                });

            setting = new Setting(containerEl)
                .setName(
                    t("Auto {kind} after stopping file edits", {
                        kind: t(commitOrSync),
                    })
                )
                .setDesc(
                    t(
                        "Requires the {kind} interval not to be 0. If turned on, do auto {kind} every {n} minutes after stopping file edits. This also prevents auto {kind} while editing a file. If turned off, it's independent from the last file edit.",
                        {
                            kind: t(commitOrSync),
                            n: plugin.settings.autoSaveInterval,
                        }
                    )
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.autoBackupAfterFileChange)
                        .onChange(async (value) => {
                            plugin.settings.autoBackupAfterFileChange = value;
                            this.refreshDisplayWithDelay();

                            await plugin.saveSettings();
                            plugin.automaticsManager.reload("commit");
                        })
                );
            this.mayDisableSetting(
                setting,
                plugin.settings.setLastSaveToLastCommit
            );

            setting = new Setting(containerEl)
                .setName(
                    t("Auto {kind} after latest commit", {
                        kind: t(commitOrSync),
                    })
                )
                .setDesc(
                    t(
                        "If turned on, sets last auto {kind} timestamp to the latest commit timestamp. This reduces the frequency of auto {kind} when doing manual commits.",
                        { kind: t(commitOrSync) }
                    )
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.setLastSaveToLastCommit)
                        .onChange(async (value) => {
                            plugin.settings.setLastSaveToLastCommit = value;
                            await plugin.saveSettings();
                            plugin.automaticsManager.reload("commit");
                            this.refreshDisplayWithDelay();
                        })
                );
            this.mayDisableSetting(
                setting,
                plugin.settings.autoBackupAfterFileChange
            );

            setting = new Setting(containerEl)
                .setName(t("Auto push interval (minutes)"))
                .setDesc(
                    t(
                        "Push commits every X minutes. Set to 0 (default) to disable. Recommended: 30 minutes when enabled."
                    )
                )
                .addText((text) => {
                    text.inputEl.type = "number";
                    this.setNonDefaultValue({
                        text,
                        settingsProperty: "autoPushInterval",
                    });
                    text.setPlaceholder("30");
                    text.onChange(async (value) => {
                        if (value !== "") {
                            plugin.settings.autoPushInterval = Number(value);
                        } else {
                            plugin.settings.autoPushInterval =
                                DEFAULT_SETTINGS.autoPushInterval;
                        }
                        await plugin.saveSettings();
                        plugin.automaticsManager.reload("push");
                    });
                });
            this.mayDisableSetting(
                setting,
                !plugin.settings.differentIntervalCommitAndPush
            );

            new Setting(containerEl)
                .setName(t("Auto pull interval (minutes)"))
                .setDesc(
                    t(
                        "Pull changes every X minutes. Set to 0 (default) to disable. Recommended: 30 minutes when enabled."
                    )
                )
                .addText((text) => {
                    text.inputEl.type = "number";
                    this.setNonDefaultValue({
                        text,
                        settingsProperty: "autoPullInterval",
                    });
                    text.setPlaceholder("30");
                    text.onChange(async (value) => {
                        if (value !== "") {
                            plugin.settings.autoPullInterval = Number(value);
                        } else {
                            plugin.settings.autoPullInterval =
                                DEFAULT_SETTINGS.autoPullInterval;
                        }
                        await plugin.saveSettings();
                        plugin.automaticsManager.reload("pull");
                    });
                });

            new Setting(containerEl)
                .setName(t("Pull on startup"))
                .setDesc(t("Automatically pull commits when Obsidian starts."))
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.autoPullOnBoot)
                        .onChange(async (value) => {
                            plugin.settings.autoPullOnBoot = value;
                            await plugin.saveSettings();
                        })
                );

            new Setting(containerEl)
                .setName(
                    t("Auto {kind} only staged files", {
                        kind: t(commitOrSync),
                    })
                )
                .setDesc(
                    t(
                        "If turned on, only staged files are committed on {kind}. If turned off, all changed files are committed.",
                        { kind: t(commitOrSync) }
                    )
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.autoCommitOnlyStaged)
                        .onChange(async (value) => {
                            plugin.settings.autoCommitOnlyStaged = value;
                            await plugin.saveSettings();
                        })
                );

            new Setting(containerEl)
                .setName(
                    t("Specify custom commit message on auto {kind}", {
                        kind: t(commitOrSync),
                    })
                )
                .setDesc(t("You will get a pop up to specify your message."))
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.customMessageOnAutoBackup)
                        .onChange(async (value) => {
                            plugin.settings.customMessageOnAutoBackup = value;
                            await plugin.saveSettings();
                            this.refreshDisplayWithDelay();
                        })
                );

            // ===== 拉取策略 =====
            new Setting(containerEl).setName(t("Pull Strategy")).setHeading();

            if (plugin.gitManager instanceof SimpleGit)
                new Setting(containerEl)
                    .setName(t("Pull strategy"))
                    .setDesc(
                        t(
                            "Decide how to integrate commits from your remote branch into your local branch."
                        )
                    )
                    .addDropdown((dropdown) => {
                        const options: Record<SyncMethod, string> = {
                            merge: t("Merge"),
                            rebase: t("Rebase"),
                            reset: t(
                                "Reset (only updates HEAD, leaving the working directory untouched)"
                            ),
                        };
                        dropdown.addOptions(options);
                        dropdown.setValue(plugin.settings.syncMethod);

                        dropdown.onChange(async (option) => {
                            plugin.settings.syncMethod = option as SyncMethod;
                            await plugin.saveSettings();
                        });
                    });

            new Setting(containerEl)
                .setName(t("Merge strategy on conflicts"))
                .setDesc(
                    t(
                        "Decide how to solve conflicts when pulling remote changes. This can be used to favor your local changes or the remote changes automatically."
                    )
                )
                .addDropdown((dropdown) => {
                    const options: Record<MergeStrategy, string> = {
                        none: t("None (git default)"),
                        ours: t("Our changes"),
                        theirs: t("Their changes"),
                    };
                    dropdown.addOptions(options);
                    dropdown.setValue(plugin.settings.mergeStrategy);

                    dropdown.onChange(async (option) => {
                        plugin.settings.mergeStrategy = option as MergeStrategy;
                        await plugin.saveSettings();
                    });
                });

            new Setting(containerEl)
                .setName(t("Push on commit-and-sync"))
                .setDesc(
                    t(
                        "Most of the time you want to push after committing. Turning this off turns a commit-and-sync action into {action} only. It will still be called commit-and-sync.",
                        {
                            action: plugin.settings.pullBeforePush
                                ? t("commit and pull")
                                : t("commit"),
                        }
                    )
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(!plugin.settings.disablePush)
                        .onChange(async (value) => {
                            plugin.settings.disablePush = !value;
                            this.refreshDisplayWithDelay();
                            await plugin.saveSettings();
                        })
                );

            new Setting(containerEl)
                .setName(t("Pull on commit-and-sync"))
                .setDesc(
                    t(
                        "On commit-and-sync, pull commits as well. Turning this off turns a commit-and-sync action into {action} only.",
                        {
                            action: plugin.settings.disablePush
                                ? t("commit")
                                : t("commit and push"),
                        }
                    )
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.pullBeforePush)
                        .onChange(async (value) => {
                            plugin.settings.pullBeforePush = value;
                            this.refreshDisplayWithDelay();
                            await plugin.saveSettings();
                        })
                );

            if (plugin.gitManager instanceof SimpleGit) {
                new Setting(containerEl)
                    .setName(t("Squash commits before push"))
                    .setDesc(
                        t(
                            "On commit-and-sync, squash all local unpushed commits into a single commit right before pushing. Keeps the remote history clean when committing often. Only unpushed commits are rewritten, so no force-push is needed."
                        )
                    )
                    .addToggle((toggle) =>
                        toggle
                            .setValue(plugin.settings.squashCommitsBeforePush)
                            .onChange(async (value) => {
                                plugin.settings.squashCommitsBeforePush = value;
                                await plugin.saveSettings();
                            })
                    );
            }

            // ===== 提交 =====
            new Setting(containerEl).setName(t("Commit")).setHeading();

            setting = new Setting(containerEl)
                .setName(
                    t("Commit message on auto {kind}", {
                        kind: t(commitOrSync),
                    })
                )
                .setDesc(
                    t(
                        "Available placeholders: {{date}} (see below), {{hostname}} (see below), {{numFiles}} (number of changed files in the commit) and {{files}} (changed files in commit message)."
                    )
                )
                .addTextArea((text) => {
                    text.setPlaceholder(
                        DEFAULT_SETTINGS.autoCommitMessage
                    ).onChange(async (value) => {
                        if (value === "") {
                            plugin.settings.autoCommitMessage =
                                DEFAULT_SETTINGS.autoCommitMessage;
                        } else {
                            plugin.settings.autoCommitMessage = value;
                        }
                        await plugin.saveSettings();
                    });
                    this.setNonDefaultValue({
                        text,
                        settingsProperty: "autoCommitMessage",
                    });
                });
            this.mayDisableSetting(
                setting,
                plugin.settings.customMessageOnAutoBackup
            );

            const manualCommitMessageSetting = new Setting(containerEl)
                .setName(t("Commit message on manual commit"))
                .setDesc(
                    t(
                        "Available placeholders: {{date}} (see below), {{hostname}} (see below), {{numFiles}} (number of changed files in the commit) and {{files}} (changed files in commit message). Leave empty to require manual input on each commit."
                    )
                );
            manualCommitMessageSetting.addTextArea((text) => {
                manualCommitMessageSetting.addButton((button) => {
                    button
                        .setIcon("reset")
                        .setTooltip(
                            t('Set to default: "{template}"', {
                                template: DEFAULT_SETTINGS.commitMessage,
                            })
                        )
                        .onClick(() => {
                            text.setValue(DEFAULT_SETTINGS.commitMessage);
                            text.onChanged();
                        });
                });
                text.setValue(plugin.settings.commitMessage);
                text.onChange(async (value) => {
                    plugin.settings.commitMessage = value;
                    await plugin.saveSettings();
                });
            });

            new Setting(containerEl)
                .setName(t("Commit message script"))
                .setDesc(
                    t(
                        "A script that is run using 'sh -c' to generate the commit message. May be used to generate commit messages using AI tools. Available placeholders: {{hostname}}, {{date}}."
                    )
                )
                .addText((text) => {
                    text.onChange(async (value) => {
                        if (value === "") {
                            plugin.settings.commitMessageScript =
                                DEFAULT_SETTINGS.commitMessageScript;
                        } else {
                            plugin.settings.commitMessageScript = value;
                        }
                        await plugin.saveSettings();
                    });
                    this.setNonDefaultValue({
                        text,
                        settingsProperty: "commitMessageScript",
                    });
                });

            const datePlaceholderSetting = new Setting(containerEl)
                .setName(t("{{date}} placeholder format"))
                .addMomentFormat((text) =>
                    text
                        .setDefaultFormat(plugin.settings.commitDateFormat)
                        .setValue(plugin.settings.commitDateFormat)
                        .onChange(async (value) => {
                            plugin.settings.commitDateFormat = value;
                            await plugin.saveSettings();
                        })
                );

            datePlaceholderSetting.descEl.createSpan({
                text: t(
                    ' Specify custom date format. E.g. "YYYY-MM-DD HH:mm:ss". See '
                ),
            });
            datePlaceholderSetting.descEl.createEl("a", {
                text: t("Moment.js documentation"),
                href: FORMAT_STRING_REFERENCE_URL,
                attr: {
                    target: "_blank",
                },
            });
            datePlaceholderSetting.descEl.createSpan({
                text: t(" for more formats."),
            });

            new Setting(containerEl)
                .setName(t("{{hostname}} placeholder replacement"))
                .setDesc(
                    t(
                        "Specify custom hostname for every device. Defaults to the OS hostname if not set on desktop."
                    )
                )
                .addText((text) =>
                    text
                        .setValue(plugin.localStorage.getHostname() ?? "")
                        .onChange((value) => {
                            plugin.localStorage.setHostname(value);
                        })
                );

            new Setting(containerEl)
                .setName(t("Preview commit message"))
                .addButton((button) =>
                    button.setButtonText(t("Preview")).onClick(async () => {
                        const commitMessagePreview =
                            await plugin.gitManager.formatCommitMessage(
                                plugin.settings.commitMessage
                            );
                        new Notice(`${commitMessagePreview}`);
                    })
                );

            new Setting(containerEl)
                .setName(
                    t("List filenames affected by commit in the commit body")
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.listChangedFilesInMessageBody)
                        .onChange(async (value) => {
                            plugin.settings.listChangedFilesInMessageBody =
                                value;
                            await plugin.saveSettings();
                        })
                );

            new Setting(containerEl).setName(t("Commit author")).setHeading();

            if (plugin.gitReady)
                new Setting(containerEl)
                    .setName(t("Author name for commit"))
                    .addText(async (cb) => {
                        cb.setValue(
                            (await plugin.gitManager.getConfig("user.name")) ??
                                ""
                        );
                        cb.onChange(async (value) => {
                            await plugin.gitManager.setConfig(
                                "user.name",
                                value == "" ? undefined : value
                            );
                        });
                    });

            if (plugin.gitReady)
                new Setting(containerEl)
                    .setName(t("Author email for commit"))
                    .addText(async (cb) => {
                        cb.setValue(
                            (await plugin.gitManager.getConfig("user.email")) ??
                                ""
                        );
                        cb.onChange(async (value) => {
                            await plugin.gitManager.setConfig(
                                "user.email",
                                value == "" ? undefined : value
                            );
                        });
                    });
        }

        // ===== 通知 =====
        new Setting(containerEl).setName(t("Notifications")).setHeading();

        new Setting(containerEl)
            .setName(t("Disable informative notifications"))
            .setDesc(
                t(
                    "Disable informative notifications for git operations to minimize distraction (refer to status bar for updates)."
                )
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.disablePopups)
                    .onChange(async (value) => {
                        plugin.settings.disablePopups = value;
                        this.refreshDisplayWithDelay();
                        await plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t("Disable error notifications"))
            .setDesc(
                t(
                    "Disable error notifications of any kind to minimize distraction (refer to status bar for updates)."
                )
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(!plugin.settings.showErrorNotices)
                    .onChange(async (value) => {
                        plugin.settings.showErrorNotices = !value;
                        await plugin.saveSettings();
                    })
            );

        if (!plugin.settings.disablePopups)
            new Setting(containerEl)
                .setName(t("Hide notifications for no changes"))
                .setDesc(
                    t(
                        "Don't show notifications when there are no changes to commit or push."
                    )
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.disablePopupsForNoChanges)
                        .onChange(async (value) => {
                            plugin.settings.disablePopupsForNoChanges = value;
                            await plugin.saveSettings();
                        })
                );

        new Setting(containerEl)
            .setName(t("Show status bar"))
            .setDesc(
                t("Obsidian must be restarted for the changes to take affect.")
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.showStatusBar)
                    .onChange(async (value) => {
                        plugin.settings.showStatusBar = value;
                        await plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t("Show branch status bar"))
            .setDesc(
                t("Obsidian must be restarted for the changes to take affect.")
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.showBranchStatusBar)
                    .onChange(async (value) => {
                        plugin.settings.showBranchStatusBar = value;
                        await plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t("Show the count of modified files in the status bar"))
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.changedFilesInStatusBar)
                    .onChange(async (value) => {
                        plugin.settings.changedFilesInStatusBar = value;
                        await plugin.saveSettings();
                    })
            );

        // ===== 高级 =====
        new Setting(containerEl).setName(t("Advanced")).setHeading();

        if (plugin.gitManager instanceof SimpleGit) {
            new Setting(containerEl)
                .setName(t("Hunk management"))
                .setDesc(
                    t(
                        "Hunks are sections of grouped line changes right in your editor."
                    )
                )
                .setHeading();

            new Setting(containerEl)
                .setName(t("Signs"))
                .setDesc(
                    t(
                        "This allows you to see your changes right in your editor via colored markers and stage/reset/preview individual hunks."
                    )
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.hunks.showSigns)
                        .onChange(async (value) => {
                            plugin.settings.hunks.showSigns = value;
                            await plugin.saveSettings();
                            plugin.editorIntegration.refreshSignsSettings();
                        })
                );

            new Setting(containerEl)
                .setName(t("Hunk commands"))
                .setDesc(
                    t(
                        "Adds commands to stage/reset individual Git diff hunks and navigate between them via 'Go to next/prev hunk' commands."
                    )
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.hunks.hunkCommands)
                        .onChange(async (value) => {
                            plugin.settings.hunks.hunkCommands = value;
                            await plugin.saveSettings();

                            plugin.editorIntegration.refreshSignsSettings();
                        })
                );

            new Setting(containerEl)
                .setName(t("Status bar with summary of line changes"))
                .addDropdown((toggle) =>
                    toggle
                        .addOptions({
                            disabled: t("Disabled"),
                            colored: t("Colored"),
                            monochrome: t("Monochrome"),
                        })
                        .setValue(plugin.settings.hunks.statusBar)
                        .onChange(async (option) => {
                            plugin.settings.hunks.statusBar =
                                option as ObsidianGitSettings["hunks"]["statusBar"];
                            await plugin.saveSettings();
                            plugin.editorIntegration.refreshSignsSettings();
                        })
                );

            new Setting(containerEl)
                .setName(t("Line author information"))
                .setHeading();

            this.addLineAuthorInfoSettings();
        }

        new Setting(containerEl).setName(t("History view")).setHeading();

        new Setting(containerEl)
            .setName(t("Show Author"))
            .setDesc(t("Show the author of the commit in the history view."))
            .addDropdown((dropdown) => {
                const options: Record<ShowAuthorInHistoryView, string> = {
                    hide: t("Hide"),
                    full: t("Full"),
                    initials: t("Initials"),
                };
                dropdown.addOptions(options);
                dropdown.setValue(plugin.settings.authorInHistoryView);
                dropdown.onChange(async (option) => {
                    plugin.settings.authorInHistoryView =
                        option as ShowAuthorInHistoryView;
                    await plugin.saveSettings();
                    await plugin.refresh();
                });
            });

        new Setting(containerEl)
            .setName(t("Show Date"))
            .setDesc(
                t(
                    "Show the date of the commit in the history view. The {{date}} placeholder format is used to display the date."
                )
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.dateInHistoryView)
                    .onChange(async (value) => {
                        plugin.settings.dateInHistoryView = value;
                        await plugin.saveSettings();
                        await plugin.refresh();
                    })
            );

        new Setting(containerEl).setName(t("Source control view")).setHeading();

        new Setting(containerEl)
            .setName(
                t("Automatically refresh source control view on file changes")
            )
            .setDesc(
                t(
                    "On slower machines this may cause lags. If so, just disable this option."
                )
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.refreshSourceControl)
                    .onChange(async (value) => {
                        plugin.settings.refreshSourceControl = value;
                        await plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t("Source control view refresh interval"))
            .setDesc(
                t(
                    "Milliseconds to wait after file change before refreshing the Source Control View."
                )
            )
            .addText((text) => {
                const MIN_SOURCE_CONTROL_REFRESH_INTERVAL = 500;
                text.inputEl.type = "number";
                this.setNonDefaultValue({
                    text,
                    settingsProperty: "refreshSourceControlTimer",
                });
                text.setPlaceholder(
                    String(DEFAULT_SETTINGS.refreshSourceControlTimer)
                );
                text.onChange(async (value) => {
                    if (value !== "" && Number.isInteger(Number(value))) {
                        plugin.settings.refreshSourceControlTimer = Math.max(
                            Number(value),
                            MIN_SOURCE_CONTROL_REFRESH_INTERVAL
                        );
                    } else {
                        plugin.settings.refreshSourceControlTimer =
                            DEFAULT_SETTINGS.refreshSourceControlTimer;
                    }
                    await plugin.saveSettings();
                    plugin.setRefreshDebouncer();
                });
            });

        if (plugin.gitManager instanceof SimpleGit) {
            new Setting(containerEl)
                .setName(t("Diff view style"))
                .setDesc(
                    t(
                        'Set the style for the diff view. Note that the actual diff in "Split" mode is not generated by Git, but the editor itself instead so it may differ from the diff generated by Git. One advantage of this is that you can edit the text in that view.'
                    )
                )
                .addDropdown((dropdown) => {
                    const options: Record<
                        ObsidianGitSettings["diffStyle"],
                        string
                    > = {
                        split: t("Split"),
                        git_unified: t("Unified"),
                    };
                    dropdown.addOptions(options);
                    dropdown.setValue(plugin.settings.diffStyle);
                    dropdown.onChange(async (option) => {
                        plugin.settings.diffStyle =
                            option as ObsidianGitSettings["diffStyle"];
                        await plugin.saveSettings();
                    });
                });
        }

        new Setting(containerEl)
            .setName(t("File menu integration"))
            .setDesc(
                t(
                    'Add "Stage", "Unstage" and "Add to .gitignore" actions to the file menu.'
                )
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.showFileMenu)
                    .onChange(async (value) => {
                        plugin.settings.showFileMenu = value;
                        await plugin.saveSettings();
                    })
            );

        if (plugin.gitManager instanceof IsomorphicGit)
            new Setting(containerEl)
                .setName(
                    t(
                        "Username on your git server. E.g. your username on GitHub"
                    )
                )
                .addText((cb) => {
                    cb.setValue(plugin.localStorage.getUsername() ?? "");
                    cb.onChange((value) => {
                        plugin.localStorage.setUsername(value);
                    });
                });

        if (plugin.gitManager instanceof IsomorphicGit)
            new Setting(containerEl)
                .setName(t("Password/Personal access token"))
                .setDesc(
                    t(
                        "Type in your password. You won't be able to see it again."
                    )
                )
                .addText((cb) => {
                    cb.inputEl.autocapitalize = "off";
                    cb.inputEl.autocomplete = "off";
                    cb.inputEl.spellcheck = false;
                    cb.onChange((value) => {
                        plugin.localStorage.setPassword(value);
                    });
                });

        new Setting(containerEl)
            .setName(t("Disable on this device"))
            .setDesc(
                t(
                    "Disables the plugin on this device. This setting is not synced."
                )
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.localStorage.getPluginDisabled())
                    .onChange((value) => {
                        plugin.localStorage.setPluginDisabled(value);
                        if (value) {
                            plugin.unloadPlugin();
                        } else {
                            plugin
                                .init({ fromReload: true })
                                .catch((e) => plugin.displayError(e));
                        }
                        new Notice(
                            t(
                                "Obsidian must be restarted for the changes to take affect."
                            )
                        );
                    })
            );

        const debugDiv = containerEl.createDiv();
        debugDiv.setAttr("align", "center");
        debugDiv.setAttr("style", "margin: var(--size-4-2)");

        const debugButton = debugDiv.createEl("button");
        debugButton.setText(t("Copy Debug Information"));
        debugButton.onclick = async () => {
            await window.navigator.clipboard.writeText(
                JSON.stringify(
                    {
                        settings: this.plugin.settings,
                        pluginVersion: this.plugin.manifest.version,
                    },
                    null,
                    4
                )
            );
            new Notice(
                t(
                    "Debug information copied to clipboard. May contain sensitive information!"
                )
            );
        };

        if (Platform.isDesktopApp) {
            const info = containerEl.createDiv();
            info.setAttr("align", "center");
            info.setText(
                t(
                    "Debugging and logging:\nYou can always see the logs of this and every other plugin by opening the console with"
                )
            );
            const keys = containerEl.createDiv();
            keys.setAttr("align", "center");
            keys.addClass("obsidian-git-shortcuts");
            if (Platform.isMacOS === true) {
                keys.createEl("kbd", { text: "CMD (⌘) + OPTION (⌥) + I" });
            } else {
                keys.createEl("kbd", { text: "CTRL + SHIFT + I" });
            }
        }
    }

    mayDisableSetting(setting: Setting, disable: boolean) {
        if (disable) {
            setting.setDisabled(disable);
            setting.setClass("obsidian-git-disabled");
        }
    }

    public configureLineAuthorShowStatus(show: boolean) {
        this.settings.lineAuthor.show = show;
        void this.plugin.saveSettings();

        if (show) this.plugin.editorIntegration.activateLineAuthoring();
        else this.plugin.editorIntegration.deactiveLineAuthoring();
    }

    /**
     * Persists the setting {@link key} with value {@link value} and
     * refreshes the line author info views.
     */
    public async lineAuthorSettingHandler<
        K extends keyof ObsidianGitSettings["lineAuthor"],
    >(key: K, value: ObsidianGitSettings["lineAuthor"][K]): Promise<void> {
        this.settings.lineAuthor[key] = value;
        await this.plugin.saveSettings();
        this.plugin.editorIntegration.lineAuthoringFeature.refreshLineAuthorViews();
    }

    /**
     * Ensure, that certain last shown values are persistent in the settings.
     *
     * Necessary for the line author info gutter context menus.
     */
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

    private addLineAuthorInfoSettings() {
        const baseLineAuthorInfoSetting = new Setting(this.containerEl).setName(
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
            attr: {
                target: "_blank",
            },
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
                this.refreshDisplayWithDelay();
            })
        );

        if (this.settings.lineAuthor.show) {
            const trackMovement = new Setting(this.containerEl)
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
                attr: {
                    target: "_blank",
                },
            });
            trackMovement.descEl.createSpan({
                text: t(
                    " and for matches (at least {n} characters) within the same (or all) commit(s), ",
                    {
                        n: GIT_LINE_AUTHORING_MOVEMENT_DETECTION_MINIMAL_LENGTH,
                    }
                ),
            });
            trackMovement.descEl.createEl("em", { text: t("the originating") });
            trackMovement.descEl.createSpan({
                text: t(" commit's information is shown."),
            });

            new Setting(this.containerEl)
                .setName(t("Show commit hash"))
                .addToggle((tgl) => {
                    tgl.setValue(this.settings.lineAuthor.showCommitHash);
                    tgl.onChange((value: boolean) =>
                        this.lineAuthorSettingHandler("showCommitHash", value)
                    );
                });

            new Setting(this.containerEl)
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

                    dropdown.onChange(async (value) =>
                        this.lineAuthorSettingHandler(
                            "authorDisplay",
                            value as LineAuthorDisplay
                        )
                    );
                });

            new Setting(this.containerEl)
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
                        this.refreshDisplayWithDelay();
                    });
                });

            if (this.settings.lineAuthor.dateTimeFormatOptions === "custom") {
                const dateTimeFormatCustomStringSetting = new Setting(
                    this.containerEl
                );

                dateTimeFormatCustomStringSetting
                    .setName(t("Custom authoring date format"))
                    .addText((cb) => {
                        cb.setValue(
                            this.settings.lineAuthor.dateTimeFormatCustomString
                        );
                        cb.setPlaceholder("YYYY-MM-DD HH:mm");

                        cb.onChange(async (value) => {
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

            const timezoneSetting = new Setting(this.containerEl)
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

                    dropdown.onChange(async (value) =>
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
            timezoneSetting.descEl.createSpan({
                text: t("."),
            });

            const oldestAgeSetting = new Setting(this.containerEl).setName(
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
                    const valid = duration !== undefined;
                    this.setOldestAgeDescription(
                        oldestAgeSetting.descEl,
                        value
                    );
                    if (valid) {
                        await this.lineAuthorSettingHandler(
                            "coloringMaxAge",
                            value
                        );
                        this.refreshColorSettingsName("oldest");
                    }
                });
            });

            this.createColorSetting("newest");
            this.createColorSetting("oldest");

            const textColorSetting = new Setting(this.containerEl)
                .setName(t("Text color"))
                .addText((field) => {
                    field.setValue(this.settings.lineAuthor.textColorCss);
                    field.onChange(async (value) => {
                        await this.lineAuthorSettingHandler(
                            "textColorCss",
                            value
                        );
                    });
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
                attr: {
                    style: "display:inline",
                },
            });
            textColorSetting.descEl.createSpan({ text: t(" or ") });
            textColorSetting.descEl.createEl("pre", {
                text: "var(--text-on-accent)",
                attr: {
                    style: "display:inline",
                },
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

            const ignoreWhitespaceSetting = new Setting(this.containerEl)
                .setName(t("Ignore whitespace and newlines in changes"))
                .addToggle((tgl) => {
                    tgl.setValue(this.settings.lineAuthor.ignoreWhitespace);
                    tgl.onChange((value) =>
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

    private createColorSetting(which: "oldest" | "newest") {
        const setting = new Setting(this.containerEl)
            .setName("")
            .addText((text) => {
                const color = pickColor(which, this.settings.lineAuthor);
                const defaultColor = pickColor(
                    which,
                    DEFAULT_SETTINGS.lineAuthor
                );
                text.setPlaceholder(rgbToString(defaultColor));
                text.setValue(rgbToString(color));
                text.onChange(async (colorNew) => {
                    const rgb = convertToRgb(colorNew);
                    if (rgb !== undefined) {
                        const key =
                            which === "newest" ? "colorNew" : "colorOld";
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
            : `rgba(127,127,127,0.3)`;
        const today = moment.unix(moment.now() / 1000).format("YYYY-MM-DD");
        const text = colorIsValid
            ? `abcdef Author Name ${today}`
            : t("invalid color");

        descEl.createEl("div", {
            text: text,
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
        descEl.createSpan({
            text: t(" to display the authoring date."),
        });
        descEl.createEl("br");
        const formattedDateTime = moment().format(dateTimeFormatCustomString);
        descEl.createSpan({
            text: t("Currently: {datetime}", {
                datetime: formattedDateTime,
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

    /**
     * Sets the value in the textbox for a given setting only if the saved value differs from the default value.
     * If the saved value is the default value, it probably wasn't defined by the user, so it's better to display it as a placeholder.
     */
    private setNonDefaultValue({
        settingsProperty,
        text,
    }: {
        settingsProperty: keyof ObsidianGitSettings;
        text: TextComponent | TextAreaComponent;
    }): void {
        const storedValue = this.plugin.settings[settingsProperty];
        const defaultValue = DEFAULT_SETTINGS[settingsProperty];

        if (defaultValue !== storedValue) {
            // Doesn't add "" to saved strings
            if (
                typeof storedValue === "string" ||
                typeof storedValue === "number" ||
                typeof storedValue === "boolean"
            ) {
                text.setValue(String(storedValue));
            } else {
                text.setValue(JSON.stringify(storedValue));
            }
        }
    }

    /**
     * Delays the update of the settings UI.
     * Used when the user toggles one of the settings that control enabled states of other settings. Delaying the update
     * allows most of the toggle animation to run, instead of abruptly jumping between enabled/disabled states.
     */
    private refreshDisplayWithDelay(timeout = 80): void {
        window.setTimeout(() => this.display(), timeout);
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
