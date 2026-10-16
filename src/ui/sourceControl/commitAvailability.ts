export interface CommitContext {
    ready: boolean;
    pending: boolean;
    hasConflicts: boolean;
    rebaseInProgress: boolean;
    mergeInProgress: boolean;
    stagedCount: number;
    changedCount: number;
    autoStageOnEmptyIndex: boolean;
}

/** 文字按钮、菜单和快捷键共用同一安全边界，排队机制仍由调用方负责。 */
export function getCommitAvailability(context: CommitContext) {
    const allowed =
        context.ready &&
        !context.pending &&
        !context.hasConflicts &&
        !context.rebaseInProgress;
    const staged = allowed && context.stagedCount > 0;
    const all = allowed && context.stagedCount + context.changedCount > 0;
    return {
        staged,
        all,
        smart:
            allowed &&
            (context.mergeInProgress ||
                context.stagedCount > 0 ||
                (context.autoStageOnEmptyIndex && context.changedCount > 0)),
        syncStaged: staged,
        syncAll: allowed,
    };
}
