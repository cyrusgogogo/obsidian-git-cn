import { describe, expect, it, vi } from "vitest";
import type { GitActionResult } from "src/gitAction";
import { PromiseQueue } from "src/promiseQueue";
import type { CommitAndSyncResult, CommitResult } from "src/types";
import { createCommitSubmission } from "src/ui/sourceControl/commitSubmission";

type Result = GitActionResult<CommitResult | CommitAndSyncResult>;
const committed: Result = {
    status: "success",
    value: { status: "committed", files: 1 },
};

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}

function harness() {
    const queue = new PromiseQueue();
    const result = deferred<Result>();
    const finished = deferred<void>();
    let message = "原始提交信息";
    let revision = 0;
    let pending = false;
    const run = vi.fn(() => result.promise);
    const refresh = vi.fn(() => finished.resolve());
    const clearMessage = vi.fn(() => (message = ""));
    const submission = createCommitSubmission({
        queue,
        getDraft: () => ({ message, revision }),
        run,
        setPending: (value) => (pending = value),
        clearMessage,
        refresh,
    });
    return {
        queue,
        result,
        finished: finished.promise,
        run,
        refresh,
        clearMessage,
        submission,
        get pending() {
            return pending;
        },
        get message() {
            return message;
        },
        edit(value: string) {
            message = value;
            revision++;
        },
    };
}

describe("源码控制提交快照与 pending 锁", () => {
    it("排队等待与执行期间共用锁，刷新后也拒绝菜单和快捷键重复入队", async () => {
        const h = harness();
        const gate = deferred<void>();
        h.queue.addTask(() => gate.promise);
        const request = {
            kind: "commit",
            mode: "staged",
            amend: true,
        } as const;
        h.submission.submit(request);
        expect(h.pending).toBe(true);
        h.edit("下一次提交");
        h.refresh();
        h.submission.submit({ kind: "sync", mode: "all" });
        expect(h.pending).toBe(true);
        expect(h.run).not.toHaveBeenCalled();

        gate.resolve();
        await vi.waitFor(() => expect(h.run).toHaveBeenCalledOnce());
        expect(h.run).toHaveBeenCalledWith({
            kind: "commit",
            mode: "staged",
            amend: true,
            commitMessage: "原始提交信息",
        });
        h.submission.submit({ kind: "commit", mode: "all" });
        h.result.resolve(committed);
        await vi.waitFor(() => expect(h.pending).toBe(false));
        expect(h.run).toHaveBeenCalledOnce();
        expect(h.message).toBe("下一次提交");
        expect(h.clearMessage).not.toHaveBeenCalled();
    });

    it("同步入队捕获 mode/message，不读取等待期间的新输入", async () => {
        const h = harness();
        const request: { kind: "sync"; mode: "staged" | "all" } = {
            kind: "sync",
            mode: "staged",
        };
        h.submission.submit(request);
        request.mode = "all";
        h.edit("新的信息");
        h.result.resolve({
            status: "success",
            value: {
                status: "synced",
                commit: { status: "committed", files: 1 },
            },
        });
        await h.finished;
        expect(h.run).toHaveBeenCalledWith({
            kind: "sync",
            mode: "staged",
            commitMessage: "原始提交信息",
        });
        expect(h.message).toBe("新的信息");
    });

    it.each<Result>([
        committed,
        {
            status: "success",
            value: {
                status: "commit-only",
                reason: "push-disabled",
                commit: { status: "committed", files: 1 },
            },
        },
        {
            status: "success",
            value: {
                status: "skipped",
                reason: "push-skipped",
                commit: { status: "committed", files: 1 },
            },
        },
    ])("实际提交成功且未编辑才清空：%j", async (result) => {
        const h = harness();
        h.submission.submit({ kind: "commit", mode: "smart" });
        h.result.resolve(result);
        await h.finished;
        expect(h.message).toBe("");
        expect(h.clearMessage).toHaveBeenCalledOnce();
        expect(h.pending).toBe(false);
    });

    it.each<Result>([
        { status: "failed" },
        { status: "cancelled" },
        {
            status: "success",
            value: { status: "nothing-to-commit", reason: "nothing-staged" },
        },
        {
            status: "success",
            value: { status: "skipped", reason: "files-too-large" },
        },
        {
            status: "success",
            value: {
                status: "synced",
                commit: { status: "nothing-to-commit", reason: "no-changes" },
            },
        },
    ])("失败、取消或未实际提交保留信息并解锁：%j", async (result) => {
        const h = harness();
        h.submission.submit({ kind: "sync", mode: "all" });
        h.result.resolve(result);
        await h.finished;
        expect(h.message).toBe("原始提交信息");
        expect(h.clearMessage).not.toHaveBeenCalled();
        expect(h.pending).toBe(false);
    });

    it("输入改动后即使恢复原文也不清空", async () => {
        const h = harness();
        h.submission.submit({ kind: "commit", mode: "all" });
        h.edit("临时编辑");
        h.edit("原始提交信息");
        h.result.resolve(committed);
        await h.finished;
        expect(h.message).toBe("原始提交信息");
        expect(h.clearMessage).not.toHaveBeenCalled();
    });

    it("动作异常仍释放锁并保留输入，队列可继续执行", async () => {
        const h = harness();
        const log = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);
        try {
            h.submission.submit({ kind: "commit", mode: "staged" });
            h.result.reject(new Error("提交异常"));
            await h.finished;
            expect(h.pending).toBe(false);
            expect(h.message).toBe("原始提交信息");
            const next = deferred<void>();
            h.queue.addTask(
                () => Promise.resolve(),
                () => next.resolve()
            );
            await next.promise;
        } finally {
            log.mockRestore();
        }
    });
});
