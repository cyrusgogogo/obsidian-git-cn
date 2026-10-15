import { readFile } from "fs/promises";
import path from "path";
import debug from "debug";
import { afterEach, describe, expect, it, vi } from "vitest";
import { withCleanup } from "../helpers/cleanup";
import { createSimpleGitTestContext } from "../helpers/simpleGit";
import { createIsomorphicGitManager } from "../helpers/isomorphicGit";

afterEach(() => vi.restoreAllMocks());

describe("同步安全边界", () => {
    it("远端分叉时不 squash 或覆盖远端历史", async () => {
        const { repo, manager } = withCleanup(
            await createSimpleGitTestContext()
        );
        await repo.git.checkoutLocalBranch("remote-work");
        await repo.writeAndCommit("remote.md", "remote\n", "remote");
        const remoteHead = await repo.head();
        await repo.raw(["update-ref", "refs/remotes/origin/main", remoteHead]);
        await repo.git.checkout("main");
        await repo.appendAndCommit("note.md", "one\n", "one");
        await repo.appendAndCommit("note.md", "two\n", "two");
        const head = await repo.head();

        await manager.squashAllUnpushedCommits();

        expect(await repo.head()).toBe(head);
        expect(await repo.raw(["rev-parse", "origin/main"])).toBe(remoteHead);
    });

    it("squash 提交失败恢复 HEAD/index，保留工作区和备份", async () => {
        const { repo, manager } = withCleanup(
            await createSimpleGitTestContext()
        );
        await repo.appendAndCommit("note.md", "one\n", "one");
        await repo.appendAndCommit("note.md", "two\n", "two");
        repo.write("note.md", "uncommitted\n");
        const head = await repo.head();
        const indexPath = path.join(repo.repoPath, ".git/index");
        const index = await readFile(indexPath);
        const raw = manager.git.raw.bind(manager.git);
        vi.spyOn(manager.git, "raw").mockImplementation(
            (...args: unknown[]) => {
                const commands = args[0] as string[];
                if (commands[0] === "commit") throw new Error("commit failed");
                return raw(commands);
            }
        );

        await expect(manager.squashAllUnpushedCommits()).rejects.toThrow();

        expect(await repo.head()).toBe(head);
        expect(await readFile(indexPath)).toEqual(index);
        expect(
            await readFile(path.join(repo.repoPath, "note.md"), "utf8")
        ).toBe("uncommitted\n");
        expect(
            await repo.raw([
                "for-each-ref",
                "--format=%(objectname)",
                "refs/obsidian-git/pre-squash/",
            ])
        ).toBe(head);
    });

    it("soft reset 失败同样恢复 HEAD/index", async () => {
        const { repo, manager } = withCleanup(
            await createSimpleGitTestContext()
        );
        await repo.appendAndCommit("note.md", "one\n", "one");
        await repo.appendAndCommit("note.md", "two\n", "two");
        const head = await repo.head();
        const index = await readFile(path.join(repo.repoPath, ".git/index"));
        vi.spyOn(manager.git, "reset").mockRejectedValueOnce(
            new Error("reset failed")
        );

        await expect(manager.squashAllUnpushedCommits()).rejects.toThrow(
            "reset failed"
        );

        expect(await repo.head()).toBe(head);
        expect(await readFile(path.join(repo.repoPath, ".git/index"))).toEqual(
            index
        );
    });

    it.each(["+refs/heads/main:refs/heads/main", ":refs/heads/main", ":"])(
        "拒绝危险推送 refspec %s",
        async (refspec) => {
            const { repo, manager } = withCleanup(
                await createSimpleGitTestContext()
            );
            await repo.git.addConfig("remote.origin.push", refspec);
            const push = vi.spyOn(manager.git, "push");

            await expect(manager.push()).rejects.toThrow("push/refspec");

            expect(push).not.toHaveBeenCalled();
        }
    );

    it("拒绝 mirror 配置及所有 raw push 旁路", async () => {
        const { repo, manager } = withCleanup(
            await createSimpleGitTestContext()
        );
        await repo.git.addConfig("remote.origin.mirror", "true");
        const push = vi.spyOn(manager.git, "push");
        await expect(manager.push()).rejects.toThrow("push/mirror");
        for (const command of [
            "push --force",
            "push --mirror",
            "push --delete origin main",
            "-c alias.publish=push publish",
        ]) {
            await expect(manager.rawCommand(command)).rejects.toThrow(
                "raw-command"
            );
        }
        expect(push).not.toHaveBeenCalled();
    });

    it("正常推送显式关闭 force/mirror/子模块递归", async () => {
        const { repo, manager } = withCleanup(
            await createSimpleGitTestContext()
        );
        await repo.appendAndCommit("note.md", "one\n", "one");
        const push = vi.spyOn(manager.git, "push");
        await manager.push();
        expect(push).toHaveBeenCalledWith([
            "--no-force",
            "--no-mirror",
            "--recurse-submodules=no",
        ]);
        expect(await repo.unpushedCount()).toBe(0);
    });

    it("native 与移动端设置尚不存在的上游只写本地配置", async () => {
        const { repo, manager } = withCleanup(
            await createSimpleGitTestContext()
        );
        const push = vi.spyOn(manager.git, "push");
        await manager.updateUpstreamBranch("origin/unpublished");
        expect(push).not.toHaveBeenCalled();
        expect((await repo.git.getConfig("branch.main.merge")).value).toBe(
            "refs/heads/unpublished"
        );
        expect((await repo.git.getConfig("branch.main.remote")).value).toBe(
            "origin"
        );
        const { manager: mobile } = createIsomorphicGitManager(repo.repoPath);
        await mobile.updateUpstreamBranch("origin/mobile-unpublished");
        expect((await repo.git.getConfig("branch.main.merge")).value).toBe(
            "refs/heads/mobile-unpublished"
        );
        expect(
            await repo.raw([
                "ls-remote",
                "--heads",
                "origin",
                "unpublished",
                "mobile-unpublished",
            ])
        ).toBe("");
    });

    it("库外未提交修改阻止保护提交和拉取，不暂存任何内容", async () => {
        const { repo, manager, plugin } = withCleanup(
            await createSimpleGitTestContext()
        );
        plugin.settings.limitToVault = true;
        const adapter = manager.app.vault.adapter as unknown as {
            getBasePath(): string;
        };
        adapter.getBasePath = () => path.join(repo.repoPath, "vault");
        repo.write("outside.md", "outside\n");
        const add = vi.spyOn(manager.git, "add");
        const fetch = vi.spyOn(manager.git, "fetch");

        await expect(
            manager.commitAll({ message: "保护", protective: true })
        ).rejects.toThrow("sync/outside-vault");
        await expect(manager.pull()).rejects.toThrow("sync/outside-vault");
        expect(add).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
        expect(await repo.cachedDiffNames()).toBe("");
    });

    it("gitlink 子模块阻止保护提交、拉取和推送", async () => {
        const { repo, manager } = withCleanup(
            await createSimpleGitTestContext()
        );
        await repo.raw([
            "update-index",
            "--add",
            "--cacheinfo",
            `160000,${await repo.head()},module`,
        ]);
        const head = await repo.head();
        await expect(
            manager.commitAll({ message: "保护", protective: true })
        ).rejects.toThrow("sync/submodule");
        await expect(manager.pull()).rejects.toThrow("sync/submodule");
        await expect(manager.push()).rejects.toThrow("sync/submodule");
        expect(await repo.head()).toBe(head);
        expect(await repo.cachedDiffNames()).toBe("module");
        const { manager: mobile } = createIsomorphicGitManager(repo.repoPath);
        await expect(
            mobile.commitAll({ message: "保护", protective: true })
        ).rejects.toThrow("sync/submodule");
        await expect(mobile.pull()).rejects.toThrow("sync/submodule");
        await expect(mobile.push()).rejects.toThrow("sync/submodule");
    });

    it("远端新引入子模块时两个后端均拒绝合并", async () => {
        const { repo, manager } = withCleanup(
            await createSimpleGitTestContext()
        );
        const head = await repo.head();
        await repo.raw([
            "update-index",
            "--add",
            "--cacheinfo",
            `160000,${head},module`,
        ]);
        await repo.git.commit("remote submodule");
        await repo.git.push(["--recurse-submodules=no"]);
        await repo.git.reset(["--mixed", head]);

        await expect(manager.pull()).rejects.toThrow("sync/submodule");
        expect(await repo.head()).toBe(head);
        const { manager: mobile } = createIsomorphicGitManager(repo.repoPath);
        vi.spyOn(mobile, "fetch").mockResolvedValue();
        await expect(mobile.pull()).rejects.toThrow("sync/submodule");
        expect(await repo.head()).toBe(head);
    });

    it("库外已暂存修改不被保护性提交悄悄提交", async () => {
        const { repo, manager, plugin } = withCleanup(
            await createSimpleGitTestContext()
        );
        plugin.settings.limitToVault = true;
        const adapter = manager.app.vault.adapter as unknown as {
            getBasePath(): string;
        };
        adapter.getBasePath = () => path.join(repo.repoPath, "vault");
        repo.write("outside.md", "outside\n");
        await repo.git.add("outside.md");
        const head = await repo.head();
        await expect(
            manager.commitAll({ message: "保护", protective: true })
        ).rejects.toThrow("sync/outside-vault");
        expect(await repo.head()).toBe(head);
        expect(await repo.cachedDiffNames()).toBe("outside.md");
    });

    it("初始化禁用 simple-git 底层 debug 的所有子命名空间", async () => {
        const { manager } = withCleanup(await createSimpleGitTestContext());
        const previous = debug.disable();
        debug.enable("*");
        vi.spyOn(manager, "isGitInstalled").mockResolvedValue(false);
        try {
            await manager.setGitInstance();
            expect(debug.enabled("simple-git")).toBe(false);
            expect(debug.enabled("simple-git:task:push")).toBe(false);
        } finally {
            debug.enable(previous);
        }
    });
});
