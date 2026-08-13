import { describe, expect, it } from "vitest";

import { describeRemoteState, formatRemoteStatus } from "src/remoteState";

describe("describeRemoteState", () => {
    it("本地与远端一致时不产生通知", () => {
        expect(describeRemoteState(0, 0)).toBeNull();
        expect(describeRemoteState(2, 0)).toBeNull();
    });

    it("落后于远端时给出拉取提示", () => {
        expect(describeRemoteState(0, 3)).toEqual({
            key: "Remote is ahead by {n} commit(s). Pull to get the latest changes.",
            params: { n: 3 },
        });
    });

    it("本地与远端分叉时给出分叉提示", () => {
        expect(describeRemoteState(2, 3)).toEqual({
            key: "Local and remote have diverged ({ahead} ahead / {behind} behind)",
            params: { ahead: 2, behind: 3 },
        });
    });
});

describe("formatRemoteStatus", () => {
    it("常驻显示领先与落后数量", () => {
        expect(formatRemoteStatus({ ahead: 0, behind: 0, unpushed: 0 })).toBe(
            "↑0 ↓0"
        );
    });

    it("有未推送提交时追加显示", () => {
        expect(formatRemoteStatus({ ahead: 2, behind: 1, unpushed: 2 })).toBe(
            "↑2 ↓1 · 2↑"
        );
    });

    it("仅落后时正确显示", () => {
        expect(formatRemoteStatus({ ahead: 0, behind: 3, unpushed: 0 })).toBe(
            "↑0 ↓3"
        );
    });
});
