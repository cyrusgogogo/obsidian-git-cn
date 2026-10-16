import type {
    App,
    ButtonComponent,
    Setting,
    SettingDefinitionGroup,
    SettingDefinitionPage,
    SettingGroup,
} from "obsidian";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS } from "src/constants";
import { SimpleGit } from "src/gitManager/simpleGit";
import { IsomorphicGit } from "src/gitManager/isomorphicGit";
import { getLocale, setLocale, t } from "src/i18n";
import type ObsidianGit from "src/main";
import { ObsidianGitSettingsTab } from "src/setting/settings";
import { flattenSettings } from "src/setting/syncLayout";
import { mergeSettingsByPriority } from "src/types";

vi.mock("obsidian", async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    PluginSettingTab: class {
        constructor(public app: App) {}
        update() {}
    },
    SettingPage: class {},
}));
vi.mock("src/gitManager/simpleGit", () => ({ SimpleGit: class {} }));
vi.mock("src/gitManager/isomorphicGit", () => ({ IsomorphicGit: class {} }));
vi.mock("src/editor/lineAuthor/lineAuthorProvider", () => ({
    previewColor: vi.fn(),
}));
vi.mock("src/utils", () => ({ convertToRgb: vi.fn(), rgbToString: vi.fn() }));

afterEach(() => setLocale("zh"));

function createSettingsTab() {
    const manager = {
        branchInfo: vi
            .fn()
            .mockResolvedValue({ current: "notes", branches: ["notes"] }),
        getRemotes: vi.fn().mockResolvedValue(["origin"]),
        getRemoteUrl: vi.fn(),
    };
    Object.setPrototypeOf(manager, SimpleGit.prototype);
    const plugin = {
        settings: structuredClone(DEFAULT_SETTINGS),
        gitReady: true,
        gitManager: manager,
        saveSettings: vi.fn().mockResolvedValue(undefined),
        changeBasePath: vi.fn().mockResolvedValue(undefined),
        automaticsManager: { reload: vi.fn() },
        editorIntegration: { refreshSignsSettings: vi.fn() },
        refresh: vi.fn().mockResolvedValue(undefined),
        setRefreshDebouncer: vi.fn(),
        displayError: vi.fn(),
        gitActions: {
            commitAndSync: vi.fn().mockResolvedValue({ status: "synced" }),
        },
        promiseQueue: {
            addTask:
                vi.fn<
                    (
                        task: () => Promise<unknown>,
                        onFinished?: (result: unknown) => void
                    ) => void
                >(),
        },
    };
    const app = { vault: { getName: () => "知识库" } };
    const tab = new ObsidianGitSettingsTab(
        app as unknown as App,
        plugin as unknown as ObsidianGit
    );
    const update = vi.spyOn(tab, "update");
    return { tab, plugin, manager, update };
}

function page(tab: ObsidianGitSettingsTab, name: string) {
    const result = tab
        .getSettingDefinitions()
        .find(
            (item): item is SettingDefinitionPage =>
                "type" in item && item.type === "page" && item.name === name
        );
    expect(result).toBeDefined();
    return result!;
}

function card(tab: ObsidianGitSettingsTab, id: string) {
    const result = page(tab, t("Automatic sync")).items!.find(
        (item): item is SettingDefinitionGroup =>
            "type" in item &&
            item.type === "group" &&
            item.cls?.includes(`git-settings-trigger-${id}`) === true
    );
    expect(result).toBeDefined();
    return result!;
}

describe("真实卡片与原生导航", () => {
    it("保留全部原生分类、行作者子页和高级设置", () => {
        const { tab } = createSettingsTab();
        const pages = tab
            .getSettingDefinitions()
            .filter((item) => "type" in item && item.type === "page");
        expect(pages.map((item) => item.name)).toEqual([
            t("Repository & Remote"),
            t("Automatic sync"),
            t("Commit"),
            t("Pull Strategy"),
            t("Editor"),
            t("Views"),
            t("Notifications"),
            t("Commit author"),
            t("Advanced"),
        ]);
        const editor = page(tab, t("Editor"));
        expect(
            editor.items!.some(
                (item) => "type" in item && item.type === "page" && item.page
            )
        ).toBe(true);
        const advancedKeys = flattenSettings(
            page(tab, t("Advanced")).items!
        ).map((item) => item.control?.key);
        expect(advancedKeys).toEqual(
            expect.arrayContaining([
                "updateSubmodules",
                "submoduleRecurseCheckout",
                "limitToVault",
                "basePath",
                "gitDir",
            ])
        );
    });

    it("四张卡片映射真实配置，不引入手动或定时虚构开关", () => {
        const { tab } = createSettingsTab();
        expect(
            flattenSettings(card(tab, "manual").items!).every(
                (item) => !item.control
            )
        ).toBe(true);
        expect(
            flattenSettings(card(tab, "scheduled").items!).flatMap((item) =>
                item.control ? [item.control.key] : []
            )
        ).toEqual([
            "differentIntervalCommitAndPush",
            "autoSaveInterval",
            "autoBackupAfterFileChange",
            "setLastSaveToLastCommit",
            "autoPushInterval",
            "autoPullInterval",
        ]);
        expect(flattenSettings(card(tab, "boot").items!)[0]?.control?.key).toBe(
            "autoPullOnBoot"
        );
        expect(flattenSettings(card(tab, "push").items!)[0]?.control?.key).toBe(
            "pushOnCommitAndSync"
        );
        const preferences = flattenSettings(
            page(tab, t("Automatic sync")).items!
        );
        expect(preferences.map((item) => item.control?.key)).toEqual(
            expect.arrayContaining([
                "autoCommitOnlyStaged",
                "customMessageOnAutoBackup",
                "autoCommitMessage",
                "syncMethod",
                "rebaseAutoStash",
            ])
        );
    });

    it("保留计时器整数校验、禁用条件和防抖互斥", () => {
        const { tab, plugin } = createSettingsTab();
        const controls = flattenSettings(card(tab, "scheduled").items!);
        const push = controls.find(
            (item) => item.control?.key === "autoPushInterval"
        )!.control!;
        expect(typeof push.disabled === "function" && push.disabled()).toBe(
            true
        );
        plugin.settings.differentIntervalCommitAndPush = true;
        expect(typeof push.disabled === "function" && push.disabled()).toBe(
            false
        );
        const interval = controls.find(
            (item) => item.control?.key === "autoSaveInterval"
        )!.control!;
        expect(interval.validate?.(1.5 as never)).toBe(
            t("Enter a whole number.")
        );
        expect(interval.validate?.(0 as never)).toBeUndefined();
        plugin.settings.setLastSaveToLastCommit = true;
        const debounce = controls.find(
            (item) => item.control?.key === "autoBackupAfterFileChange"
        )!.control!;
        expect(
            typeof debounce.disabled === "function" && debounce.disabled()
        ).toBe(true);
    });

    it("未就绪时保留仓库设置，隐藏自动同步和桌面专用策略", () => {
        const { tab, plugin, manager } = createSettingsTab();
        plugin.gitReady = false;
        const sync = page(tab, t("Automatic sync"));
        expect(typeof sync.visible === "function" && sync.visible()).toBe(
            false
        );
        expect(page(tab, t("Advanced"))).toBeDefined();
        Object.setPrototypeOf(manager, IsomorphicGit.prototype);
        const strategy = flattenSettings(sync.items!).find(
            (item) => item.control?.key === "syncMethod"
        )!;
        expect(
            typeof strategy.visible === "function" && strategy.visible()
        ).toBe(false);
        expect(
            flattenSettings(page(tab, t("Automatic sync")).items!).find(
                (item) => item.name === t("Local change protection")
            )?.desc
        ).toBe(
            t(
                "Mobile Git uses merge. Desktop rebase and reset preferences do not apply."
            )
        );
    });
});

describe("设置写入副作用", () => {
    it("手动卡片通过队列执行真实同步，避免重复点击并处理错误", async () => {
        const { tab, plugin } = createSettingsTab();
        let click = () => {};
        const button = {
            setButtonText: vi.fn(() => button),
            setCta: vi.fn(() => button),
            setDisabled: vi.fn(() => button),
            onClick: vi.fn((callback: () => void) => {
                click = callback;
                return button;
            }),
        };
        const setting = {
            addButton: (callback: (component: ButtonComponent) => unknown) =>
                callback(button as unknown as ButtonComponent),
        };
        flattenSettings(card(tab, "manual").items!)[0]!.render?.(
            setting as unknown as Setting,
            {} as SettingGroup
        );
        click();
        click();
        expect(plugin.promiseQueue.addTask).toHaveBeenCalledOnce();
        expect(button.setDisabled).toHaveBeenCalledWith(true);
        const [task, finished] = plugin.promiseQueue.addTask.mock.calls[0]!;
        await task();
        expect(plugin.gitActions.commitAndSync).toHaveBeenCalledWith({
            fromAutoBackup: false,
        });
        finished?.(undefined);
        expect(button.setDisabled).toHaveBeenLastCalledWith(false);
        click();
        const [failedTask, failedFinished] =
            plugin.promiseQueue.addTask.mock.calls[1]!;
        const error = new Error("同步失败");
        plugin.gitActions.commitAndSync.mockRejectedValueOnce(error);
        await failedTask();
        failedFinished?.(undefined);
        expect(plugin.displayError).toHaveBeenCalledWith(error);
        plugin.gitReady = false;
        click();
        expect(plugin.promiseQueue.addTask).toHaveBeenCalledTimes(2);
    });

    it.each([
        ["autoSaveInterval", 12, ["commit"]],
        ["autoPushInterval", 30, ["push"]],
        ["autoPullInterval", 20, ["pull"]],
        ["differentIntervalCommitAndPush", true, ["commit", "push"]],
        ["autoBackupAfterFileChange", false, ["commit"]],
        ["setLastSaveToLastCommit", true, ["commit"]],
    ] as const)("保存 %s 后重载对应自动任务", async (key, value, types) => {
        const { tab, plugin } = createSettingsTab();
        await tab.setControlValue(key, value);
        expect(plugin.settings[key]).toBe(value);
        expect(plugin.saveSettings).toHaveBeenCalledOnce();
        expect(plugin.automaticsManager.reload).toHaveBeenCalledWith(...types);
        expect(plugin.saveSettings.mock.invocationCallOrder[0]).toBeLessThan(
            plugin.automaticsManager.reload.mock.invocationCallOrder[0]!
        );
    });

    it("正确反转推送及通知配置并刷新显示", async () => {
        const { tab, plugin, update } = createSettingsTab();
        expect(tab.getControlValue("pushOnCommitAndSync")).toBe(true);
        await tab.setControlValue("pushOnCommitAndSync", false);
        expect(plugin.settings.disablePush).toBe(true);
        expect(tab.getControlValue("pushOnCommitAndSync")).toBe(false);
        expect(update).toHaveBeenCalled();
        await tab.setControlValue("showInformationalNotifications", false);
        await tab.setControlValue("showNoChangesNotifications", false);
        expect(plugin.settings.disablePopups).toBe(true);
        expect(plugin.settings.disablePopupsForNoChanges).toBe(true);
    });

    it("保留语言、默认模板、仓库路径、嵌套符号及视图刷新副作用", async () => {
        const { tab, plugin, update } = createSettingsTab();
        await tab.setControlValue("language", "en");
        expect(getLocale()).toBe("en");
        expect(update).toHaveBeenCalled();
        expect(page(tab, "Automatic sync")).toBeDefined();
        await tab.setControlValue("autoCommitMessage", "");
        await tab.setControlValue("commitMessageScript", "");
        expect(plugin.settings.autoCommitMessage).toBe(
            DEFAULT_SETTINGS.autoCommitMessage
        );
        expect(plugin.settings.commitMessageScript).toBe(
            DEFAULT_SETTINGS.commitMessageScript
        );
        plugin.saveSettings.mockClear();
        await tab.setControlValue("basePath", "notes");
        expect(plugin.changeBasePath).toHaveBeenCalledWith("notes");
        expect(plugin.saveSettings).not.toHaveBeenCalled();
        await tab.setControlValue("hunks.showSigns", false);
        expect(plugin.settings.hunks.showSigns).toBe(false);
        expect(
            plugin.editorIntegration.refreshSignsSettings
        ).toHaveBeenCalledOnce();
        for (const key of [
            "authorInHistoryView",
            "dateInHistoryView",
            "limitToVault",
        ]) {
            await tab.setControlValue(key, false);
        }
        expect(plugin.refresh).toHaveBeenCalledTimes(3);
        await tab.setControlValue("refreshSourceControlTimer", 1000);
        expect(plugin.setRefreshDebouncer).toHaveBeenCalledOnce();
    });

    it("切换拉取策略时同步刷新安全说明", async () => {
        const { tab, update } = createSettingsTab();
        await tab.setControlValue("syncMethod", "reset");
        expect(update).toHaveBeenCalled();
        const safety = flattenSettings(
            page(tab, t("Automatic sync")).items!
        ).find((item) => item.name === t("Local change protection"));
        expect(safety?.desc).toBe(
            t(
                "Reset backs up local history and uses --keep. It refuses to overwrite local changes; it does not silently discard the working tree."
            )
        );
    });

    it("保存失败时不重载自动任务", async () => {
        const { tab, plugin } = createSettingsTab();
        plugin.saveSettings.mockRejectedValueOnce(new Error("保存失败"));
        await expect(
            tab.setControlValue("autoSaveInterval", 12)
        ).rejects.toThrow("保存失败");
        expect(plugin.automaticsManager.reload).not.toHaveBeenCalled();
    });
});

describe("仓库摘要和设置词条", () => {
    it.each(["关闭设置页", "切换仓库"] as const)(
        "%s 后忽略旧异步摘要",
        async (reason) => {
            const { tab, manager, plugin } = createSettingsTab();
            let resolve!: (value: {
                current: string;
                branches: string[];
            }) => void;
            manager.branchInfo.mockReturnValueOnce(
                new Promise((done) => {
                    resolve = done;
                })
            );
            const setting = {
                setClass: vi.fn(),
                setName: vi.fn(),
                setDesc: vi.fn(),
            };
            const cleanup = flattenSettings(
                page(tab, t("Automatic sync")).items!
            )[0]!.render?.(setting as unknown as Setting, {} as SettingGroup);
            if (reason === "关闭设置页" && typeof cleanup === "function")
                cleanup();
            else plugin.gitManager = { ...manager };
            resolve({ current: "old", branches: ["old"] });
            await new Promise((done) => setTimeout(done, 0));
            expect(setting.setDesc).not.toHaveBeenCalled();
        }
    );

    it("并行读取真实分支和远端名称，不读取 URL", async () => {
        const { tab, manager } = createSettingsTab();
        const summary = flattenSettings(
            page(tab, t("Automatic sync")).items!
        )[0]!;
        const setting = {
            setClass: vi.fn(),
            setName: vi.fn(),
            setDesc: vi.fn(),
        };
        summary.render?.(setting as unknown as Setting, {} as SettingGroup);
        await vi.waitFor(() =>
            expect(setting.setDesc).toHaveBeenCalledWith(
                "分支：notes · 远端：origin"
            )
        );
        expect(setting.setName).toHaveBeenCalledWith("知识库");
        expect(manager.getRemoteUrl).not.toHaveBeenCalled();
    });

    it("读取失败只展示通用摘要提示，不展示原始敏感错误", async () => {
        const { tab, manager, plugin } = createSettingsTab();
        manager.branchInfo.mockRejectedValueOnce(
            new Error("https://token:password@private.invalid/repo")
        );
        const setting = {
            setClass: vi.fn(),
            setName: vi.fn(),
            setDesc: vi.fn(),
        };
        flattenSettings(page(tab, t("Automatic sync")).items!)[0]!.render?.(
            setting as unknown as Setting,
            {} as SettingGroup
        );
        await vi.waitFor(() =>
            expect(setting.setDesc).toHaveBeenCalledWith(
                t("Repository summary unavailable")
            )
        );
        expect(plugin.displayError).not.toHaveBeenCalled();
        expect(JSON.stringify(setting.setDesc.mock.calls)).not.toContain(
            "password"
        );
    });

    it.each([
        ["zh", "分支：{remotes} · 远端：$&", "分支：notes · 远端：{remotes}"],
        [
            "en",
            "Branch: {remotes} · Remotes: $&",
            "Branch: notes · Remotes: {remotes}",
        ],
    ] as const)(
        "%s 仓库摘要使用统一词典，不递归插值并保留缺失参数",
        (locale, interpolated, partial) => {
            setLocale(locale);
            const key = "Branch: {branch} · Remotes: {remotes}";
            expect(t(key, { branch: "{remotes}", remotes: "$&" })).toBe(
                interpolated
            );
            expect(t(key, { branch: "notes" })).toBe(partial);
        }
    );
});

describe("语言设置", () => {
    it("默认语言为中文", () => {
        expect(DEFAULT_SETTINGS.language).toBe("zh");
    });

    it("重启后保留用户选择的语言", () => {
        const merged = mergeSettingsByPriority(DEFAULT_SETTINGS, {
            ...DEFAULT_SETTINGS,
            language: "en",
        });

        expect(merged.language).toBe("en");
    });
});

describe("同步相关默认值", () => {
    it("启动时拉取默认开启", () => {
        expect(DEFAULT_SETTINGS.autoPullOnBoot).toBe(true);
    });

    it("提交后推送默认开启", () => {
        expect(DEFAULT_SETTINGS.disablePush).toBe(false);
    });

    it("定时同步默认关闭", () => {
        expect(DEFAULT_SETTINGS.autoPushInterval).toBe(0);
        expect(DEFAULT_SETTINGS.autoPullInterval).toBe(0);
    });

    it("防抖提交默认 5 分钟", () => {
        expect(DEFAULT_SETTINGS.autoSaveInterval).toBe(5);
        expect(DEFAULT_SETTINGS.autoBackupAfterFileChange).toBe(true);
    });

    it("拉取策略默认为 merge", () => {
        expect(DEFAULT_SETTINGS.syncMethod).toBe("merge");
    });

    it("默认提交信息使用中文模板与日期格式", () => {
        expect(DEFAULT_SETTINGS.commitMessage).toBe("同步：{{date}}");
        expect(DEFAULT_SETTINGS.autoCommitMessage).toBe("同步：{{date}}");
        expect(DEFAULT_SETTINGS.commitDateFormat).toBe("YYYY-MM-DD HH:mm");
    });
});
