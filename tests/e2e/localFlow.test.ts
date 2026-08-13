import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import simpleGit from "simple-git";
import { describe, expect, it } from "vitest";

import { cleanupTempDirectory, createTempDirectory } from "../helpers/gitRepo";

describe("初始化 → 提交 → 推送 → 拉取 全流程（本地裸仓库）", () => {
    it("两台设备之间通过远端仓库同步", async () => {
        const dir = createTempDirectory("obsidian-git-e2e-");
        const barePath = path.join(dir, "remote.git");
        await simpleGit(dir).raw([
            "init",
            "--bare",
            "--initial-branch=main",
            barePath,
        ]);

        // 设备 A：初始化、提交、推送
        const repoA = path.join(dir, "a");
        mkdirSync(repoA, { recursive: true });
        const gitA = simpleGit({
            baseDir: repoA,
            config: ["core.quotepath=off"],
        });
        await gitA.init(["--initial-branch=main"]);
        await gitA.addConfig("user.email", "test@example.com");
        await gitA.addConfig("user.name", "Test User");
        await gitA.addRemote("origin", barePath);
        writeFileSync(path.join(repoA, "note.md"), "第一版\n");
        await gitA.add("note.md");
        await gitA.commit("初始提交");
        await gitA.push(["--quiet", "-u", "origin", "main"]);

        // 设备 B：克隆并收到 A 的后续改动
        const repoB = path.join(dir, "b");
        await simpleGit(dir).raw(["clone", barePath, repoB]);
        const gitB = simpleGit({ baseDir: repoB });

        writeFileSync(path.join(repoA, "note.md"), "第二版\n");
        await gitA.add("note.md");
        await gitA.commit("更新");
        await gitA.push(["--quiet"]);

        await gitB.pull();

        expect(await gitB.catFile(["-p", "HEAD:note.md"])).toContain("第二版");
        cleanupTempDirectory(dir);
    });
});
