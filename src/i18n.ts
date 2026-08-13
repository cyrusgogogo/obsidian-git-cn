/**
 * 轻量 i18n 模块（见 ADR-0003）。
 *
 * 约定：
 * - 翻译键是英文原文，源码中保留英文 key；
 * - 默认语言为中文，英文语言包中 key 即显示文本；
 * - 所有用户可见文案应经 `t()` 渲染，禁止散落硬编码。
 */
export type Locale = "zh" | "en";

const zh: Record<string, string> = {
    "Obsidian Git": "Obsidian Git（中文版）",
    Sync: "同步",
    "{n} commits": "{n} 个提交",
};

let currentLocale: Locale = "zh";

/** 设置当前语言（默认中文）。 */
export function setLocale(locale: Locale): void {
    currentLocale = locale;
}

export function getLocale(): Locale {
    return currentLocale;
}

/**
 * 翻译一段文案；当前语言缺失条目时回退到英文 key 本身。
 * 支持 `{name}` 形式的参数替换。
 */
export function t(
    key: string,
    params?: Record<string, string | number>
): string {
    const table = currentLocale === "zh" ? zh : undefined;
    let text = table?.[key] ?? key;
    if (params) {
        for (const [name, value] of Object.entries(params)) {
            text = text.replaceAll(`{${name}}`, String(value));
        }
    }
    return text;
}
