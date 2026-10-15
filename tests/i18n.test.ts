import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "svelte/compiler";
import ts from "typescript";
import { afterEach, describe, expect, it } from "vitest";

import { getLocale, parseLocale, setLocale, t } from "src/i18n";

const sourceRoot = new URL("../src/", import.meta.url);

function visit(node: ts.Node, callback: (node: ts.Node) => void): void {
    callback(node);
    ts.forEachChild(node, (child) => visit(child, callback));
}

function sourceFiles(directory: URL): URL[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const url = new URL(entry.name, directory);
        return entry.isDirectory()
            ? sourceFiles(new URL(`${entry.name}/`, directory))
            : /\.(?:ts|svelte)$/.test(entry.name)
              ? [url]
              : [];
    });
}

function parseTypeScript(text: string): ts.SourceFile {
    return ts.createSourceFile("source.ts", text, ts.ScriptTarget.Latest, true);
}

function literalKeys(
    node: ts.Node | undefined,
    constants: Map<string, ts.Expression>
): string[] {
    if (!node) return [];
    if (ts.isStringLiteralLike(node)) return [node.text];
    if (ts.isConditionalExpression(node))
        return [
            ...literalKeys(node.whenTrue, constants),
            ...literalKeys(node.whenFalse, constants),
        ];
    if (ts.isParenthesizedExpression(node))
        return literalKeys(node.expression, constants);
    // 只解析具名常量，避免把运行时参数误判为翻译键。
    if (ts.isIdentifier(node) && /^[A-Z][A-Z0-9_]*$/.test(node.text))
        return literalKeys(constants.get(node.text), new Map());
    if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text.endsWith("_VIEW_CONFIG")
    ) {
        const config = constants.get(node.expression.text);
        if (config && ts.isObjectLiteralExpression(config)) {
            const property = config.properties.find(
                (item) =>
                    ts.isPropertyAssignment(item) &&
                    item.name.getText() === node.name.text
            );
            if (property && ts.isPropertyAssignment(property))
                return literalKeys(property.initializer, constants);
        }
    }
    return [];
}

function typeScriptKeys(
    source: ts.SourceFile,
    constants = new Map<string, ts.Expression>()
): string[] {
    const keys: string[] = [];
    visit(source, (node) => {
        if (
            ts.isVariableDeclaration(node) &&
            ts.isIdentifier(node.name) &&
            node.initializer
        )
            constants.set(node.name.text, node.initializer);
    });
    visit(source, (node) => {
        if (!ts.isCallExpression(node)) return;
        if (ts.isIdentifier(node.expression) && node.expression.text === "t")
            keys.push(...literalKeys(node.arguments[0], constants));
        // 新版设置通过辅助方法翻译标题、说明与选项，而非直接调用 t。
        if (
            ts.isPropertyAccessExpression(node.expression) &&
            node.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
            ["toggle", "dropdown"].includes(node.expression.name.text)
        ) {
            const dropdown = node.expression.name.text === "dropdown";
            keys.push(
                ...literalKeys(node.arguments[0], constants),
                ...literalKeys(node.arguments[dropdown ? 3 : 2], constants)
            );
            const options = node.arguments[2];
            if (dropdown && options && ts.isObjectLiteralExpression(options))
                for (const option of options.properties)
                    if (ts.isPropertyAssignment(option))
                        keys.push(
                            ...literalKeys(option.initializer, constants)
                        );
        }
    });
    return keys;
}

function svelteKeys(text: string): string[] {
    const keys: string[] = [];
    // Svelte 的脚本及模板表达式都由编译器解析，注释与普通文本不会误匹配。
    function walk(value: unknown): void {
        if (!value || typeof value !== "object") return;
        const node = value as Record<string, unknown>;
        if (node.type === "CallExpression") {
            const callee = node.callee as Record<string, unknown>;
            if (callee.type === "Identifier" && callee.name === "t") {
                const argument = (
                    node.arguments as Record<string, unknown>[]
                )[0];
                if (argument) {
                    const expression = text.slice(
                        argument.start as number,
                        argument.end as number
                    );
                    keys.push(
                        ...typeScriptKeys(parseTypeScript(`t(${expression})`))
                    );
                }
            }
        }
        for (const child of Object.values(node)) {
            if (Array.isArray(child)) child.forEach(walk);
            else walk(child);
        }
    }
    walk(parse(text, { modern: true }));
    return keys;
}

function translations(): [string, string][] {
    const entries: [string, string][] = [];
    visit(
        parseTypeScript(readFileSync(new URL("i18n.ts", sourceRoot), "utf8")),
        (node) => {
            if (
                ts.isVariableDeclaration(node) &&
                ts.isIdentifier(node.name) &&
                node.name.text === "zh" &&
                node.initializer &&
                ts.isObjectLiteralExpression(node.initializer)
            )
                for (const property of node.initializer.properties)
                    if (
                        ts.isPropertyAssignment(property) &&
                        ts.isStringLiteralLike(property.initializer)
                    )
                        entries.push([
                            (property.name as ts.Identifier | ts.StringLiteral)
                                .text,
                            property.initializer.text,
                        ]);
        }
    );
    return entries;
}

function placeholders(text: string): string[] {
    return [...text.matchAll(/\{\{[^{}]+\}\}|\{[^{}]+\}/g)]
        .map(([match]) => match)
        .sort();
}

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

    it("保留提交模板的双层占位符及未提供的参数", () => {
        expect(t("{{date}} placeholder format", { date: "不应替换" })).toBe(
            "{{date}} 占位符格式"
        );
        expect(t("Global: {value}")).toBe("全局设置：{value}");
    });

    it("一次性替换重复参数，不递归插值或解释替换字符", () => {
        setLocale("en");
        expect(t("{a} {a} {b}", { a: "{b}", b: "$&" })).toBe("{b} {b} $&");
    });

    it("不使用对象原型上的翻译或参数", () => {
        expect(t("toString")).toBe("toString");
        expect(t("{toString}", {})).toBe("{toString}");
    });

    it("差异标题完整替换文件与引用参数，不解释文件名中的占位符", () => {
        const params = { file: "notes/{ref}.md", ref: "HEAD" };
        expect(t("Diff: {file} ({ref})", params)).toBe(
            "差异：notes/{ref}.md（HEAD）"
        );
        setLocale("en");
        expect(t("Diff: {file} ({ref})", params)).toBe(
            "Diff: notes/{ref}.md (HEAD)"
        );
    });
});

describe("翻译完整性", () => {
    it("全 src 静态英文键、设置辅助方法及视图名称都有中文词条", () => {
        const constants = new Map<string, ts.Expression>();
        typeScriptKeys(
            parseTypeScript(
                readFileSync(new URL("constants.ts", sourceRoot), "utf8")
            ),
            constants
        );
        const dictionary = new Map(translations());
        const missing: string[] = [];
        for (const url of sourceFiles(sourceRoot)) {
            if (url.pathname.endsWith("/i18n.ts")) continue;
            const text = readFileSync(url, "utf8");
            const keys = url.pathname.endsWith(".svelte")
                ? svelteKeys(text)
                : typeScriptKeys(parseTypeScript(text), new Map(constants));
            for (const key of new Set(keys))
                if (!/[\u3400-\u9fff]/.test(key) && !dictionary.has(key))
                    missing.push(`${fileURLToPath(url)}: ${key}`);
        }
        expect(missing).toEqual([]);
    });

    it("移动端合并与推送的固定错误经统一入口翻译时不回退到英文", () => {
        const dictionary = new Map(translations());
        const missing: string[] = [];
        // 这些固定错误原文会间接传入 main.displayError 中的 t(error.message)。
        for (const path of ["gitAction.ts", "gitManager/isomorphicGit.ts"]) {
            const source = parseTypeScript(
                readFileSync(new URL(path, sourceRoot), "utf8")
            );
            visit(source, (node) => {
                if (!ts.isCallExpression(node) && !ts.isNewExpression(node))
                    return;
                const expression = node.expression;
                const errorConstructor =
                    ts.isIdentifier(expression) &&
                    ["Error", "TypeError"].includes(expression.text);
                const displayError =
                    ts.isPropertyAccessExpression(expression) &&
                    expression.name.text === "displayError";
                if (!errorConstructor && !displayError) return;
                for (const key of literalKeys(node.arguments?.[0], new Map()))
                    if (!dictionary.has(key)) missing.push(`${path}: ${key}`);
            });
        }
        expect(missing).toEqual([]);
    });

    it("全部词条非空、无重复键，中文与英文占位符及出现次数一致", () => {
        const entries = translations();
        expect(entries.length).toBeGreaterThan(0);
        expect(new Set(entries.map(([key]) => key)).size).toBe(entries.length);
        // 语言名称、时区及纯标点无需汉字，其余词条须包含中文。
        const exceptions = new Set(["English", "UTC±00:00", "."]);
        for (const [key, value] of entries) {
            expect(value.trim(), key).not.toBe("");
            if (!exceptions.has(key))
                expect(value, key).toMatch(/[\u3400-\u9fff]/);
            expect(placeholders(value), key).toEqual(placeholders(key));
            expect(t(key), key).toBe(value);
            setLocale("en");
            expect(t(key), key).toBe(key);
            setLocale("zh");
        }
    });

    it("覆盖 Git 运行时动作及原生与移动端动态阶段", () => {
        const dictionary = new Map(translations());
        // 动态阶段来自 simple-git / isomorphic-git，静态调用扫描无法发现。
        const keys = [
            "commit",
            "commit-and-sync",
            "Fetching",
            "Pulling",
            "Pushing",
            "Checking out",
            "Cloning",
            "Working",
            "counting",
            "compressing",
            "receiving",
            "resolving",
            "writing",
            "Enumerating objects",
            "Counting objects",
            "Compressing objects",
            "Receiving objects",
            "Resolving deltas",
            "Writing objects",
            "Analyzing workdir",
            "Updating workdir",
        ];
        for (const key of keys) {
            expect(dictionary.has(key), key).toBe(true);
            expect(t(key), key).toMatch(/[\u3400-\u9fff]/);
        }
    });

    it("扫描器覆盖多行、转义、模板字面量与条件分支，忽略注释", () => {
        expect(
            typeScriptKeys(
                parseTypeScript(`
                    // t("Comment")
                    t(
                        "Line\\n{n}"
                    );
                    t(\`Template {value}\`);
                    t(condition ? "First" : "Second");
                    const MESSAGE_KEY = "Constant";
                    t(MESSAGE_KEY);
                    this.toggle("Toggle", "storedKey", "Description");
                    this.dropdown("Dropdown", "storedKey", { on: "Option" });
                `)
            )
        ).toEqual([
            "Line\n{n}",
            "Template {value}",
            "First",
            "Second",
            "Constant",
            "Toggle",
            "Description",
            "Dropdown",
            "Option",
        ]);
        expect(
            svelteKeys(`
                <script lang="ts">
                    const count: number = 1;
                    t("Script");
                </script>
                <!-- t("Comment") -->
                <button aria-label={t("Label")}>
                    {t(count ? "First" : "Second")}
                </button>
            `).sort()
        ).toEqual(["First", "Label", "Script", "Second"]);
    });
});

describe("parseLocale", () => {
    it("接受 en 与 zh", () => {
        expect(parseLocale("en")).toBe("en");
        expect(parseLocale("zh")).toBe("zh");
    });

    it("缺失或无效值回退到中文", () => {
        expect(parseLocale(undefined)).toBe("zh");
        expect(parseLocale(null)).toBe("zh");
        expect(parseLocale("fr")).toBe("zh");
    });
});
