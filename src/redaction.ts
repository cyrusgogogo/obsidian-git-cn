/**
 * 隐藏远端仓库位置与凭据，保留协议、主机和错误上下文供诊断。
 * 无法从错误文本判断仓库是否公开，因此统一隐藏 URL 的路径与查询。
 */
export function redactCredentials(text: string): string {
    // 保留旧 userinfo 规则，兼容未经编码的凭据分隔符。
    return text
        .replace(/((?:https?|ssh|git):\/\/)[^@/\s]+@/gi, "$1")
        .replace(/\b(?:https?|ssh|git):\/\/[^\s"'`<>]+/gi, (url: string) => {
            // 保留包裹 URL 的标点，不吞掉后续错误码或堆栈行。
            const suffix = url.match(/[.,;:!?)}\]]+$/)?.[0] ?? "";
            const address = url.slice(0, url.length - suffix.length);
            const parts = address.match(/^([a-z]+:\/\/)([^/?#]*)([/?#].*)?$/i);
            if (!parts) return url;
            const [, scheme, authority = "", resource] = parts;
            const host = authority.slice(authority.lastIndexOf("@") + 1);
            return `${scheme}${host}${resource ? "/***" : ""}${suffix}`;
        })
        .replace(
            /(^|[\s"'`(<])(?:([^\s@/:"'`<>()]+)@)?(\[[a-f\d:]+\]|[a-z\d.-]+):((?!\/\/)[^\s"'`<>]+)/gi,
            (
                match: string,
                prefix: string,
                user: string | undefined,
                host: string,
                path: string
            ) => {
                // SCP 必须是仓库路径，避免误伤 host:port、错误码和堆栈位置。
                if (
                    !user &&
                    !path.includes("/") &&
                    !/\.git(?:[.,;:!?)}\]]*)$/i.test(path)
                )
                    return match;
                const suffix = path.match(/[.,;:!?)}\]]+$/)?.[0] ?? "";
                return `${prefix}${host}:***${suffix}`;
            }
        )
        .replace(
            /(\b(?:authorization|proxy-authorization)\b["']?[ \t]*[:=][ \t]*)("(?:\\[^\r\n]|[^"\\\r\n])*"|'(?:\\[^\r\n]|[^'\\\r\n])*'|digest[ \t]+[\w-]+=(?:"[^"\r\n]*"|[^\s,;]+)(?:[ \t]*,[ \t]*[\w-]+=(?:"[^"\r\n]*"|[^\s,;]+))*|(?:(?:bearer|basic|negotiate|token)[ \t]+)?[^\s,;"'`<>)\]}]+)/gi,
            redactValue
        )
        .replace(
            /(\b(?:token|password|passwd|access[_-]?token|refresh[_-]?token|private[_-]?token|id[_-]?token|client[_-]?secret)\b["']?[ \t]*[:=][ \t]*)("(?:\\[^\r\n]|[^"\\\r\n])*"|'(?:\\[^\r\n]|[^'\\\r\n])*'|[^\s,;"'`<>)\]}]+)/gi,
            redactValue
        );
}

function redactValue(_match: string, prefix: string, value: string): string {
    const quote = value.match(/^["']/)?.[0] ?? "";
    return `${prefix}${quote}***${quote}`;
}
