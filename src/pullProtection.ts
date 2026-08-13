import { t } from "./i18n";
import type { Status, UnstagedFile } from "./types";

/**
 * 同步前的保护性提交（见 spec FR-8 与 ADR-0002 的安全边界）。
 *
 * 当工作区存在未提交改动时，先把它们落成一个本地提交，
 * 这样后续 pull / merge / rebase 失败时仍能完整回滚。
 *
 * @returns 是否生成了保护性提交
 */
export async function createProtectiveCommit(deps: {
    updateCachedStatus(): Promise<Status>;
    commitAll(opts: {
        message: string;
        status: Status;
        unstagedFiles: UnstagedFile[];
    }): Promise<number | undefined>;
}): Promise<boolean> {
    const status = await deps.updateCachedStatus();
    if (status.all.length === 0) {
        return false;
    }
    await deps.commitAll({
        message: t("Protective commit before sync"),
        status,
        // status.changed 缺 `type` 字段，该字段仅在 isomorphic-git 需要
        unstagedFiles: status.changed as unknown as UnstagedFile[],
    });
    return true;
}
