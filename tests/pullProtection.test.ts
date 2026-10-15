import { describe, expect, it, vi } from "vitest";

import { createProtectiveCommit } from "src/pullProtection";
import type { Status } from "src/types";

function createStatus(
    all: { path: string; workingDir: string; vaultPath: string }[]
): Status {
    return {
        all,
        changed: all,
        staged: [],
        conflicted: [],
        stagedOutsideVault: 0,
        conflictedOutsideVault: 0,
    } as unknown as Status;
}

describe("保护性提交", () => {
    it("工作区干净时不生成保护性提交", async () => {
        const commitAll = vi.fn();

        const created = await createProtectiveCommit({
            updateCachedStatus: () => Promise.resolve(createStatus([])),
            commitAll,
        });

        expect(created).toBe(false);
        expect(commitAll).not.toHaveBeenCalled();
    });

    it("存在未提交改动时用中文信息提交全部改动", async () => {
        const commitAll = vi.fn();
        const status = createStatus([
            { path: "note.md", workingDir: "M", vaultPath: "note.md" },
        ]);

        const created = await createProtectiveCommit({
            updateCachedStatus: () => Promise.resolve(status),
            commitAll,
        });

        expect(created).toBe(true);
        expect(commitAll).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "同步前的保护性提交",
                status,
            })
        );
        expect(commitAll.mock.calls[0]![0]).toMatchObject({
            unstagedFiles: [{ path: "note.md", type: "M" }],
            protective: true,
        });
    });

    it("库外已暂存文件也必须进入保护检查", async () => {
        const status = createStatus([]);
        status.stagedOutsideVault = 1;
        const commitAll = vi
            .fn()
            .mockRejectedValue(new Error("scope rejected"));

        await expect(
            createProtectiveCommit({
                updateCachedStatus: () => Promise.resolve(status),
                commitAll,
            })
        ).rejects.toThrow("scope rejected");
        expect(commitAll).toHaveBeenCalledWith(
            expect.objectContaining({
                protective: true,
            })
        );
    });

    it("删除文件保留正确类型，提交异常不视为保护成功", async () => {
        const status = createStatus([
            { path: "deleted.md", workingDir: "D", vaultPath: "deleted.md" },
        ]);
        const commitAll = vi.fn().mockRejectedValue(new Error("commit failed"));
        await expect(
            createProtectiveCommit({
                updateCachedStatus: () => Promise.resolve(status),
                commitAll,
            })
        ).rejects.toThrow("commit failed");
        expect(commitAll.mock.calls[0]![0]).toMatchObject({
            unstagedFiles: [{ path: "deleted.md", type: "D" }],
        });
    });
});
