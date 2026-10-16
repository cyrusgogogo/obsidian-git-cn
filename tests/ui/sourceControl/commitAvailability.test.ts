import { describe, expect, it } from "vitest";
import {
    getCommitAvailability,
    type CommitContext,
} from "src/ui/sourceControl/commitAvailability";

const ready: CommitContext = {
    ready: true,
    pending: false,
    hasConflicts: false,
    rebaseInProgress: false,
    mergeInProgress: false,
    stagedCount: 0,
    changedCount: 0,
    autoStageOnEmptyIndex: true,
};

describe("源码控制提交安全边界", () => {
    it.each([
        { ready: false },
        { pending: true },
        { hasConflicts: true },
        { rebaseInProgress: true, mergeInProgress: true },
    ])("未就绪、pending、冲突和变基均禁用全部提交入口：%j", (blocked) => {
        const actions = getCommitAvailability({
            ...ready,
            stagedCount: 3,
            changedCount: 2,
            ...blocked,
        });
        expect(Object.values(actions)).toEqual([
            false,
            false,
            false,
            false,
            false,
        ]);
    });

    it("工作区干净时仍允许立即同步，但不允许普通提交", () => {
        expect(getCommitAvailability(ready)).toEqual({
            smart: false,
            staged: false,
            all: false,
            syncStaged: false,
            syncAll: true,
        });
    });

    it("未暂存改动只在开启自动暂存时允许智能提交", () => {
        const context = { ...ready, changedCount: 2 };
        expect(getCommitAvailability(context).smart).toBe(true);
        expect(
            getCommitAvailability({ ...context, autoStageOnEmptyIndex: false })
        ).toMatchObject({
            smart: false,
            staged: false,
            all: true,
            syncAll: true,
        });
    });

    it("有已暂存内容时保留仅暂存、全部、amend 和同步模式", () => {
        expect(
            Object.values(
                getCommitAvailability({
                    ...ready,
                    stagedCount: 1,
                    changedCount: 2,
                    autoStageOnEmptyIndex: false,
                })
            )
        ).toEqual([true, true, true, true, true]);
    });

    it("无文件改动的合并仍可手动完成并同步，不伪造暂存内容", () => {
        expect(
            getCommitAvailability({ ...ready, mergeInProgress: true })
        ).toEqual({
            smart: true,
            staged: false,
            all: false,
            syncStaged: false,
            syncAll: true,
        });
    });
});
