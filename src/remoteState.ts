/**
 * 远端变更检测的纯计算逻辑（见 spec 的 Testing Decisions）。
 * 此处不渲染文案，只输出结构化结果，由调用方经 i18n 渲染。
 */
export interface RemoteStatus {
    ahead: number;
    behind: number;
    unpushed: number;
}

export type RemoteStateNotice =
    | {
          key: "Local and remote have diverged ({ahead} ahead / {behind} behind)";
          params: { ahead: number; behind: number };
      }
    | {
          key: "Remote is ahead by {n} commit(s). Pull to get the latest changes.";
          params: { n: number };
      };

/** 依据领先/落后数量决定是否需要通知，以及通知内容的结构。 */
export function describeRemoteState(
    ahead: number,
    behind: number
): RemoteStateNotice | null {
    if (ahead > 0 && behind > 0) {
        return {
            key: "Local and remote have diverged ({ahead} ahead / {behind} behind)",
            params: { ahead, behind },
        };
    }
    if (behind > 0) {
        return {
            key: "Remote is ahead by {n} commit(s). Pull to get the latest changes.",
            params: { n: behind },
        };
    }
    return null;
}

/** 状态栏常驻文本：`↑领先 ↓落后`，有未推送提交时追加。 */
export function formatRemoteStatus(status: RemoteStatus): string {
    const text = `↑${status.ahead} ↓${status.behind}`;
    if (status.unpushed > 0) {
        return `${text} · ${status.unpushed}↑`;
    }
    return text;
}
