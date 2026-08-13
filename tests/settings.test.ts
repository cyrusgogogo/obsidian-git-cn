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

describe("同步相关默认值", () => {
    it("启动时拉取默认开启", () => {
        expect(DEFAULT_SETTINGS.autoPullOnBoot).toBe(true);
    });

    it("提交后推送默认开启", () => {
        expect(DEFAULT_SETTINGS.disablePush).toBe(false);
    });

    it("定时同步默认关闭", () => {
        expect(DEFAULT_SETTINGS.autoPushInterval).toBe(0);
        expect(DEFAULT_SETTINGS.autoPullInterval).toBe(0);
    });

    it("防抖提交默认 5 分钟", () => {
        expect(DEFAULT_SETTINGS.autoSaveInterval).toBe(5);
        expect(DEFAULT_SETTINGS.autoBackupAfterFileChange).toBe(true);
    });

    it("拉取策略默认为 merge", () => {
        expect(DEFAULT_SETTINGS.syncMethod).toBe("merge");
    });

    it("默认提交信息使用中文模板与日期格式", () => {
        expect(DEFAULT_SETTINGS.commitMessage).toBe("同步：{{date}}");
        expect(DEFAULT_SETTINGS.autoCommitMessage).toBe("同步：{{date}}");
        expect(DEFAULT_SETTINGS.commitDateFormat).toBe("YYYY-MM-DD HH:mm");
    });
});
