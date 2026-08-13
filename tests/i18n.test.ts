import { afterEach, describe, expect, it } from "vitest";

import { getLocale, setLocale, t } from "src/i18n";

afterEach(() => {
    setLocale("zh");
});

describe("i18n", () => {
    it("默认语言为中文", () => {
        expect(getLocale()).toBe("zh");
        expect(t("Sync")).toBe("同步");
    });

    it("中文缺失条目时回退到英文 key", () => {
        expect(t("Not translated yet")).toBe("Not translated yet");
    });

    it("英文语言下直接显示 key 本身", () => {
        setLocale("en");
        expect(t("Sync")).toBe("Sync");
    });

    it("支持 {name} 参数替换", () => {
        expect(t("{n} commits", { n: 3 })).toBe("3 个提交");
    });
});
