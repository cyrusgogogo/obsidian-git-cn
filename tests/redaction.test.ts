import { describe, expect, it } from "vitest";

import { redactCredentials } from "src/redaction";

describe("redactCredentials", () => {
    it("移除 HTTPS URL 中的用户名与令牌", () => {
        expect(
            redactCredentials(
                "fatal: unable to access 'https://user:TOKEN@gitee.com/repo.git/': 403"
            )
        ).toBe("fatal: unable to access 'https://gitee.com/repo.git/': 403");
    });

    it("移除 SSH URL 中的用户名", () => {
        expect(redactCredentials("ssh://git@host/repo.git failed")).toBe(
            "ssh://host/repo.git failed"
        );
    });

    it("不含凭据的文本保持不变", () => {
        expect(redactCredentials("No network connection available")).toBe(
            "No network connection available"
        );
    });
});
