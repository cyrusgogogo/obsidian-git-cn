/**
 * 从错误文本中移除 URL 里的用户信息（`user:token@`），
 * 防止 Token、密码随错误通知或日志泄露（见 AGENTS.md 数据安全边界）。
 */
export function redactCredentials(text: string): string {
    return text
        .replace(/(https?:\/\/)[^@/\s]+@/gi, "$1")
        .replace(/(ssh:\/\/)[^@/\s]+@/gi, "$1");
}
