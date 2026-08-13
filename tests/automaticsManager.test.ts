import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    commitAndSync: ReturnType<typeof vi.fn>;
    commit: ReturnType<typeof vi.fn>;
    pullChangesFromRemote: ReturnType<typeof vi.fn>;
    push: ReturnType<typeof vi.fn>;
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
            setLastAutoBackup: vi.fn(),
            setLastAutoPull: vi.fn(),
            setLastAutoPush: vi.fn(),
        },
        promiseQueue: {
            addTask: async (
                task: () => Promise<unknown>,
                after?: (result: unknown) => void
            ) => {
                const result = await task();
                after?.(result);
                return result;
            },
        },
        commitAndSync: vi.fn(),
        commit: vi.fn(),
        pullChangesFromRemote: vi.fn(),
        push: vi.fn(),
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
        expect(plugin.commitAndSync).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1 * 60000);
        expect(plugin.commitAndSync).toHaveBeenCalledTimes(1);
        expect(plugin.commit).not.toHaveBeenCalled();
    });

    it("防抖间隔为 0 时关闭自动提交", async () => {
        const plugin = createPlugin({ autoSaveInterval: 0 });
        const manager = new AutomaticsManager(plugin as unknown as ObsidianGit);
        await manager.init();

        expect(plugin.autoCommitDebouncer).toBeUndefined();
    });

    it("定时拉取与定时推送默认关闭", async () => {
        const plugin = createPlugin();
        const manager = new AutomaticsManager(plugin as unknown as ObsidianGit);
        await manager.init();

        await vi.advanceTimersByTimeAsync(24 * 60 * 60000);

        expect(plugin.pullChangesFromRemote).not.toHaveBeenCalled();
        expect(plugin.push).not.toHaveBeenCalled();
    });

    it("重启后按上次自动提交时间计算剩余间隔", async () => {
        const threeMinutesAgo = new Date(Date.now() - 3 * 60000).toString();
        const plugin = createPlugin();
        plugin.localStorage.getLastAutoBackup = () => threeMinutesAgo;

        const manager = new AutomaticsManager(plugin as unknown as ObsidianGit);
        await manager.init();

        expect(plugin.autoCommitDebouncer).toBeDefined();
        plugin.autoCommitDebouncer!();
        await vi.advanceTimersByTimeAsync(1 * 60000);
        expect(plugin.commitAndSync).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1 * 60000);
        expect(plugin.commitAndSync).toHaveBeenCalledTimes(1);
    });
});
