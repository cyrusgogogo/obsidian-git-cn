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
            unstagedFiles: status.changed,
        });
    });
});
