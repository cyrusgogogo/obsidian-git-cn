import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS } from "src/constants";
import { mergeSettingsByPriority } from "src/types";

describe("语言设置", () => {
    it("默认语言为中文", () => {
        expect(DEFAULT_SETTINGS.language).toBe("zh");
    });

    it("重启后保留用户选择的语言", () => {
        const merged = mergeSettingsByPriority(DEFAULT_SETTINGS, {
            ...DEFAULT_SETTINGS,
            language: "en",
        });

        expect(merged.language).toBe("en");
    });
});
