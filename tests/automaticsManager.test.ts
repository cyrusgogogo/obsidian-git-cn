import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PromiseQueue } from "../src/promiseQueue";
import { createFakePlugin } from "./helpers/createFakePlugin";

import AutomaticsManager from "src/automaticsManager";
import type ObsidianGit from "src/main";

type FakePlugin = {
    settings: Record<string, unknown>;
    gitReady: boolean;
    localStorage: Record<string, (...args: unknown[]) => unknown>;
    promiseQueue: {
        addTask: (
            task: () => Promise<unknown>,
            after?: (result: unknown) => void
        ) => Promise<unknown>;
    };
    gitActions: {
        commitAndSync: ReturnType<typeof vi.fn>;
        commit: ReturnType<typeof vi.fn>;
        pullChangesFromRemote: ReturnType<typeof vi.fn>;
        push: ReturnType<typeof vi.fn>;
    };
    autoCommitDebouncer?: (() => void) & { cancel(): void };
    gitManager: { getLastCommitTime(): Promise<Date | undefined> };
};

function createPlugin(overrides: Record<string, unknown> = {}): FakePlugin {
    const plugin = {
        settings: {
            autoSaveInterval: 5,
            autoBackupAfterFileChange: true,
            autoPushInterval: 0,
            autoPullInterval: 0,
            autoPullOnBoot: true,
            differentIntervalCommitAndPush: false,
            setLastSaveToLastCommit: false,
            autoCommitOnlyStaged: false,
            ...overrides,
        },
        gitReady: true,
        localStorage: {
            getPausedAutomatics: () => false,
            getLastAutoBackup: () => null,
            getLastAutoPull: () => null,
            getLastAutoPush: () => null,
            getConflict: () => false,
            setLastAutoBackup: vi.fn(),
            setLastAutoPull: vi.fn(),
            setLastAutoPush: vi.fn(),
        },
        promiseQueue: {
            addTask: async (
                task: () => Promise<unknown>,
                after?: (result: unknown) => void
            ) => {
                try {
                    const result = await task();
                    after?.(result);
                    return result;
                } catch (error) {
                    // 与真实 PromiseQueue 一致：失败也回调 onFinished
                    after?.(undefined);
                    return error;
                }
            },
        },
        gitActions: {
            commitAndSync: vi.fn().mockResolvedValue({
                status: "success",
                value: { status: "synced" },
            }),
            commit: vi.fn().mockResolvedValue({
                status: "success",
                value: { status: "nothing-to-commit", reason: "no-changes" },
            }),
            pullChangesFromRemote: vi.fn().mockResolvedValue(undefined),
            push: vi.fn().mockResolvedValue({
                status: "success",
                value: { status: "up-to-date" },
            }),
        },
        autoCommitDebouncer: undefined,
        gitManager: {
            getLastCommitTime: () => Promise.resolve(undefined),
        },
    };
    return plugin;
}

describe("AutomaticsManager 四种触发", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("停止编辑 5 分钟后自动提交并同步（防抖提交 + 提交后推送）", async () => {
        const plugin = createPlugin();
        const manager = new AutomaticsManager(plugin as unknown as ObsidianGit);
        await manager.init();

        expect(plugin.autoCommitDebouncer).toBeDefined();
        plugin.autoCommitDebouncer!();

        await vi.advanceTimersByTimeAsync(4 * 60000);
        expect(plugin.gitActions.commitAndSync).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1 * 60000);
        expect(plugin.gitActions.commitAndSync).toHaveBeenCalledTimes(1);
        expect(plugin.gitActions.commitAndSync).toHaveBeenCalledWith({
            fromAutoBackup: true,
            mode: "all",
        });
        expect(plugin.gitActions.commit).not.toHaveBeenCalled();
    });

    it("防抖间隔为 0 时关闭自动提交", async () => {
        const plugin = createPlugin({ autoSaveInterval: 0 });
        const manager = new AutomaticsManager(plugin as unknown as ObsidianGit);
        await manager.init();

        expect(plugin.autoCommitDebouncer).toBeUndefined();
    });

    it.each([false, true])(
        "独立推送间隔下仅自动提交，保留暂存模式开关（%s）",
        async (onlyStaged) => {
            const plugin = createPlugin({
                differentIntervalCommitAndPush: true,
                autoCommitOnlyStaged: onlyStaged,
            });
            const manager = new AutomaticsManager(
                plugin as unknown as ObsidianGit
            );
            await manager.init();
            plugin.autoCommitDebouncer!();

            await vi.advanceTimersByTimeAsync(5 * 60000);

            expect(plugin.gitActions.commit).toHaveBeenCalledExactlyOnceWith({
                fromAuto: true,
                mode: onlyStaged ? "staged" : "all",
            });
            expect(plugin.gitActions.commitAndSync).not.toHaveBeenCalled();
            expect(plugin.gitActions.push).not.toHaveBeenCalled();
        }
    );

    it("定时拉取与定时推送默认关闭", async () => {
        const plugin = createPlugin();
        const manager = new AutomaticsManager(plugin as unknown as ObsidianGit);
        await manager.init();

        await vi.advanceTimersByTimeAsync(24 * 60 * 60000);

        expect(plugin.gitActions.pullChangesFromRemote).not.toHaveBeenCalled();
        expect(plugin.gitActions.push).not.toHaveBeenCalled();
    });

    it("重启后按上次自动提交时间计算剩余间隔", async () => {
        const threeMinutesAgo = new Date(Date.now() - 3 * 60000).toString();
        // 剩余间隔适用于定时模式，编辑防抖始终从最后一次编辑开始计时。
        const plugin = createPlugin({ autoBackupAfterFileChange: false });
        plugin.localStorage.getLastAutoBackup = () => threeMinutesAgo;

        const manager = new AutomaticsManager(plugin as unknown as ObsidianGit);
        await manager.init();

        expect(plugin.autoCommitDebouncer).toBeUndefined();
        await vi.advanceTimersByTimeAsync(1 * 60000);
        expect(plugin.gitActions.commitAndSync).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1 * 60000);
        expect(plugin.gitActions.commitAndSync).toHaveBeenCalledTimes(1);
    });

    it("存在冲突时暂停自动同步", async () => {
        const plugin = createPlugin();
        plugin.localStorage.getConflict = () => true;
        const manager = new AutomaticsManager(plugin as unknown as ObsidianGit);
        await manager.init();

        expect(plugin.autoCommitDebouncer).toBeUndefined();
    });

    it("冲突期间重载不重启定时器", async () => {
        const plugin = createPlugin();
        plugin.localStorage.getConflict = () => true;
        const manager = new AutomaticsManager(plugin as unknown as ObsidianGit);
        await manager.init();

        manager.reload("commit", "push", "pull");

        expect(plugin.autoCommitDebouncer).toBeUndefined();
    });

    it.each(["reject", "failed-result"] as const)(
        "推送失败后按间隔自然重试，不产生重试风暴（%s）",
        async (failureMode) => {
            const plugin = createPlugin({
                differentIntervalCommitAndPush: true,
                autoPushInterval: 30,
                autoSaveInterval: 0,
            });
            const push = plugin.gitActions.push;
            if (failureMode === "reject") {
                push.mockRejectedValue(new Error("offline"));
            } else {
                push.mockResolvedValue({ status: "failed" });
            }
            const manager = new AutomaticsManager(
                plugin as unknown as ObsidianGit
            );
            await manager.init();

            await vi.advanceTimersByTimeAsync(30 * 60000);
            expect(push).toHaveBeenCalledTimes(1);
            await vi.advanceTimersByTimeAsync(1);
            expect(push).toHaveBeenCalledTimes(1);

            await vi.advanceTimersByTimeAsync(30 * 60000);
            expect(push).toHaveBeenCalledTimes(2);

            await vi.advanceTimersByTimeAsync(30 * 60000);
            expect(push).toHaveBeenCalledTimes(3);
        }
    );

    it("网络恢复后下一次定时推送成功", async () => {
        const plugin = createPlugin({
            differentIntervalCommitAndPush: true,
            autoPushInterval: 30,
            autoSaveInterval: 0,
        });
        plugin.gitActions.push
            .mockResolvedValueOnce({ status: "failed" })
            .mockResolvedValueOnce({
                status: "success",
                value: { status: "pushed", files: 1 },
            });
        const manager = new AutomaticsManager(plugin as unknown as ObsidianGit);
        await manager.init();

        await vi.advanceTimersByTimeAsync(30 * 60000);
        await vi.advanceTimersByTimeAsync(30 * 60000);

        expect(plugin.gitActions.push).toHaveBeenCalledTimes(2);
    });
});

describe("AutomaticsManager auto commit-and-sync after file edits", () => {
    it("commits an edit made during a run exactly once, via the active debouncer", async () => {
        const plugin = createFakePlugin();
        const setLastAutoBackup = vi.fn();
        const commitAndSync = vi.fn(() => {
            // 第一次同步期间产生的编辑应继续使用同一个防抖器。
            if (commitAndSync.mock.calls.length === 1) {
                plugin.autoCommitDebouncer?.();
            }
            return Promise.resolve();
        });
        Object.assign(plugin, {
            gitReady: true,
            settings: {
                autoSaveInterval: 5,
                autoBackupAfterFileChange: true,
                setLastSaveToLastCommit: false,
                autoCommitOnlyStaged: false,
                differentIntervalCommitAndPush: false,
                autoPushInterval: 0,
                autoPullInterval: 0,
            },
            localStorage: {
                ...plugin.localStorage,
                getPausedAutomatics: () => false,
                getLastAutoBackup: () => undefined,
                setLastAutoBackup,
                getLastAutoPull: () => undefined,
                getLastAutoPush: () => undefined,
            },
            promiseQueue: new PromiseQueue(),
            gitActions: { ...plugin.gitActions, commitAndSync },
        });
        const manager = new AutomaticsManager(plugin);
        await manager.init();

        const firstDebouncer = plugin.autoCommitDebouncer!;
        firstDebouncer();
        firstDebouncer.run();
        await vi.waitFor(() => expect(setLastAutoBackup).toHaveBeenCalled());
        expect(commitAndSync).toHaveBeenCalledTimes(1);

        // 第一次同步中的编辑必须留在当前防抖器中。
        plugin.autoCommitDebouncer!.run();
        await vi.waitFor(() =>
            expect(setLastAutoBackup).toHaveBeenCalledTimes(2)
        );
        expect(commitAndSync).toHaveBeenCalledTimes(2);

        // 旧防抖器不能再次提交同一批编辑。
        firstDebouncer.run();
        await new Promise<void>((resolve) =>
            plugin.promiseQueue.addTask(() => Promise.resolve(), resolve)
        );
        expect(commitAndSync).toHaveBeenCalledTimes(2);

        manager.unload();
    });
});
