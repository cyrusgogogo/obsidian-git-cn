import { describe, expect, it } from "vitest";

import { redactCredentials } from "src/redaction";

describe("redactCredentials", () => {
    it("移除 HTTPS URL 中的用户名与令牌并隐藏仓库路径", () => {
        expect(
            redactCredentials(
                "fatal: unable to access 'https://user:TOKEN@gitee.com/repo.git/': 403"
            )
        ).toBe("fatal: unable to access 'https://gitee.com/***': 403");
    });

    it("移除 SSH URL 中的用户名", () => {
        expect(redactCredentials("ssh://git@host/repo.git failed")).toBe(
            "ssh://host/*** failed"
        );
    });

    it.each([
        ["https://user:TOKEN@host", "https://host"],
        ["HTTP://user:password@host:8080", "HTTP://host:8080"],
        ["ssh://git@host", "ssh://host"],
        ["ssh://git@[::1]:2222", "ssh://[::1]:2222"],
        ["https://user:p?ss#word@host/repo.git", "https://host/***"],
    ])("兼容原有 userinfo 脱敏：%s", (input, output) => {
        expect(redactCredentials(input)).toBe(output);
    });

    it.each([
        ["https://host/private/repo.git", "https://host/***"],
        [
            "http://host:8080/org/repo?token=SECRET#private",
            "http://host:8080/***",
        ],
        ["https://host?private=SECRET", "https://host/***"],
        ["https://host#private", "https://host/***"],
        ["git://host/private/repo.git", "git://host/***"],
        [
            "ssh://git@[2001:db8::1]:2222/private/repo.git",
            "ssh://[2001:db8::1]:2222/***",
        ],
        ["https://user:p%40ss@host/org%2Frepo?x=SECRET", "https://host/***"],
        ["https://host", "https://host"],
    ])("隐藏远端 URL 的私有位置：%s", (input, output) => {
        expect(redactCredentials(input)).toBe(output);
    });

    it.each([
        ["git@host:private/repo.git", "host:***"],
        ["git@host:repo", "host:***"],
        ["git@host:/srv/private/repo.git", "host:***"],
        ["host:private/repo.git", "host:***"],
        ["host:repo.git", "host:***"],
        ["git@[2001:db8::1]:private/repo.git", "[2001:db8::1]:***"],
        [
            "fatal: 'git@host:private/repo.git': Permission denied (publickey).",
            "fatal: 'host:***': Permission denied (publickey).",
        ],
    ])("隐藏 SCP 仓库地址：%s", (input, output) => {
        expect(redactCredentials(input)).toBe(output);
    });

    it.each([
        ["token=SECRET status=403", "token=*** status=403"],
        ["PASSWORD: SECRET, exit code 128", "PASSWORD: ***, exit code 128"],
        ["password='secret with spaces' failed", "password='***' failed"],
        [
            '{"token":"SECRET","password":"SECRET","status":401}',
            '{"token":"***","password":"***","status":401}',
        ],
        ['password="secret\\"with spaces" failed', 'password="***" failed'],
        [
            "access_token=SECRET refreshToken: SECRET",
            "access_token=*** refreshToken: ***",
        ],
        [
            "private-token: SECRET; client_secret=SECRET",
            "private-token: ***; client_secret=***",
        ],
        ["id_token=SECRET passwd=SECRET", "id_token=*** passwd=***"],
        [
            "Authorization: Bearer SECRET status=401",
            "Authorization: *** status=401",
        ],
        [
            "authorization=Basic dXNlcjpwYXNz, HTTP 403",
            "authorization=***, HTTP 403",
        ],
        [
            "Proxy-Authorization: Negotiate SECRET\nECONNRESET",
            "Proxy-Authorization: ***\nECONNRESET",
        ],
        [
            '{"Authorization": "Bearer SECRET", "status": 401}',
            '{"Authorization": "***", "status": 401}',
        ],
        [
            'Authorization: Digest username="private", uri="/private/repo", response="SECRET" status=401',
            "Authorization: *** status=401",
        ],
        ["Authorization: SECRET", "Authorization: ***"],
    ])("隐藏显式凭据并保留诊断字段：%s", (input, output) => {
        expect(redactCredentials(input)).toBe(output);
    });

    it("保留多条错误、标点和本地堆栈位置", () => {
        expect(
            redactCredentials(
                "Error: https://user:SECRET@host:443/private?key=SECRET, HTTP 403 (ECONNRESET)\n" +
                    "remote: 'git@host:private/repo.git': Permission denied (publickey).\n" +
                    "    at sync (/workspace/src/main.ts:12:3)\n" +
                    "connect ECONNREFUSED 127.0.0.1:8080"
            )
        ).toBe(
            "Error: https://host:443/***, HTTP 403 (ECONNRESET)\n" +
                "remote: 'host:***': Permission denied (publickey).\n" +
                "    at sync (/workspace/src/main.ts:12:3)\n" +
                "connect ECONNREFUSED 127.0.0.1:8080"
        );
    });

    it("支持一条消息中的多个 URL 且重复脱敏不改变结果", () => {
        const input =
            "https://user:SECRET@host/one.git; ssh://git@host/two.git (git@host:three.git) token=SECRET Authorization: Bearer SECRET";
        const output =
            "https://host/***; ssh://host/*** (host:***) token=*** Authorization: ***";
        expect(redactCredentials(input)).toBe(output);
        expect(redactCredentials(output)).toBe(output);
    });

    it.each([
        "",
        "HTTP 401 Unauthorized; HTTP 403 Forbidden; exit code 128",
        "fatal: Authentication failed; password authentication disabled",
        "token expired; Authorization failed",
        "ssh: connect to host host port 22: Connection refused",
        "at sync (C:\\vault\\plugin.js:12:3)",
        "name@example.com",
        "Authorization:\nHTTP 401",
        "password=\nECONNRESET",
    ])("保留不含敏感值的诊断：%s", (input) => {
        expect(redactCredentials(input)).toBe(input);
    });

    it("不含凭据的文本保持不变", () => {
        expect(redactCredentials("No network connection available")).toBe(
            "No network connection available"
        );
    });
});
