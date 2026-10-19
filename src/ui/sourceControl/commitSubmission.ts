import type { GitActionResult } from "src/gitAction";
import type { PromiseQueue } from "src/promiseQueue";
import type { CommitAndSyncResult, CommitMode, CommitResult } from "src/types";

interface CommitDraft {
    message: string;
    revision: number;
}

export type CommitRequest =
    | { kind: "commit"; mode: CommitMode; amend?: boolean }
    | { kind: "sync"; mode: "staged" | "all" };

type SubmissionResult = GitActionResult<CommitResult | CommitAndSyncResult>;
type Snapshot = Readonly<CommitRequest & { commitMessage: string }>;

export function createCommitSubmission(options: {
    queue: Pick<PromiseQueue, "addTask">;
    getDraft: () => CommitDraft;
    run: (snapshot: Snapshot) => Promise<SubmissionResult>;
    setPending: (pending: boolean) => void;
    clearMessage: () => void;
    refresh: () => void;
}) {
    let pending = false;

    return {
        submit(request: CommitRequest): void {
            if (pending) return;
            const draft = options.getDraft();
            const snapshot = Object.freeze({
                ...request,
                commitMessage: draft.message,
            });
            pending = true;
            options.setPending(true);
            try {
                options.queue.addTask(async () => {
                    try {
                        const result = await options.run(snapshot);
                        const current = options.getDraft();
                        if (
                            result.status === "success" &&
                            (result.value.status === "committed" ||
                                ("commit" in result.value &&
                                    result.value.commit.status ===
                                        "committed")) &&
                            current.message === draft.message &&
                            current.revision === draft.revision
                        ) {
                            options.clearMessage();
                        }
                    } finally {
                        // 只有本次排队动作结束才能解锁，状态刷新不得修改 pending。
                        pending = false;
                        options.setPending(false);
                        options.refresh();
                    }
                });
            } catch (error) {
                pending = false;
                options.setPending(false);
                throw error;
            }
        },
    };
}
