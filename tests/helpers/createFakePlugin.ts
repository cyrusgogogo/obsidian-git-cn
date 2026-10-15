import { vi } from "vitest";
import type ObsidianGit from "../../src/main";
import { GitOperation } from "../../src/types";

export type FakePlugin = ObsidianGit & {
    app: {
        workspace: {
            trigger: ReturnType<typeof vi.fn>;
        };
    };
    setPluginState: ReturnType<typeof vi.fn>;
    log: ReturnType<typeof vi.fn>;
    displayError: ReturnType<typeof vi.fn>;
};

export function createFakePlugin(): FakePlugin {
    let conflict = false;
    let paused = false;
    const lastAuto: Record<"backup" | "pull" | "push", string | null> = {
        backup: null,
        pull: null,
        push: null,
    };
    return {
        manifest: { id: "obsidian-git-cn" },
        app: {
            workspace: {
                trigger: vi.fn(),
            },
        },
        settings: {},
        localStorage: {
            getConflict: vi.fn(() => conflict),
            setConflict: vi.fn((value: boolean) => {
                conflict = value;
            }),
            getPausedAutomatics: vi.fn(() => paused),
            setPausedAutomatics: vi.fn((value: boolean) => {
                paused = value;
            }),
            getLastAutoBackup: vi.fn(() => lastAuto.backup),
            setLastAutoBackup: vi.fn((value: string) => {
                lastAuto.backup = value;
            }),
            getLastAutoPull: vi.fn(() => lastAuto.pull),
            setLastAutoPull: vi.fn((value: string) => {
                lastAuto.pull = value;
            }),
            getLastAutoPush: vi.fn(() => lastAuto.push),
            setLastAutoPush: vi.fn((value: string) => {
                lastAuto.push = value;
            }),
            getHostname: vi.fn().mockReturnValue(null),
        },
        gitActions: {
            commitAndSync: vi.fn(),
            commit: vi.fn(),
            pullChangesFromRemote: vi.fn(),
            push: vi.fn(),
        },
        state: {
            offlineMode: false,
            mergeInProgress: false,
            operation: GitOperation.idle,
        },
        setPluginState: vi.fn(),
        log: vi.fn(),
        displayError: vi.fn(),
    } as unknown as FakePlugin;
}
