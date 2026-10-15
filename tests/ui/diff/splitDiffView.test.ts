import { mkdirSync } from "fs";
import path from "path";
import { describe, expect, it, vi } from "vitest";

import SplitDiffView, { getSplitDiffTimeout } from "src/ui/diff/splitDiffView";
import type { DiffViewState } from "src/types";
import { PromiseQueue } from "src/promiseQueue";
import { t } from "src/i18n";
import { MergeConflictModal } from "src/ui/modals/mergeConflictModal";
import { withCleanup } from "../../helpers/cleanup";
import {
    createRepoWithMergeConflict,
    createRepoWithOrigin,
} from "../../helpers/gitRepo";
import { createSimpleGitTestContext } from "../../helpers/simpleGit";

describe("getSplitDiffTimeout", () => {
    it("uses ten times the configured timeout for read-only diffs", () => {
        expect(getSplitDiffTimeout(75, true)).toBe(75);
        expect(getSplitDiffTimeout(75, false)).toBe(750);
    });

    it("falls back to the default timeout for invalid persisted values", () => {
        expect(getSplitDiffTimeout(0, true)).toBe(50);
        expect(getSplitDiffTimeout(-1, true)).toBe(50);
        expect(getSplitDiffTimeout(1.5, false)).toBe(500);
        expect(getSplitDiffTimeout(Number.NaN, true)).toBe(50);
    });
});

describe("SplitDiffView.gitShow", () => {
    it("reads our index version of an unmerged file", async () => {
        const { manager } = withCleanup(
            await createSimpleGitTestContext({
                fixture: createRepoWithMergeConflict,
            })
        );
        const view = Object.assign(Object.create(SplitDiffView.prototype), {
            plugin: { gitManager: manager },
        }) as SplitDiffView;

        await expect(view.gitShow("", "note.md")).resolves.toBe("ours\n");
        await expect(view.gitShow("HEAD", "note.md")).resolves.toBe("ours\n");
    });

    it("uses an empty comparison when our side deleted the file", async () => {
        const { manager } = withCleanup(
            await createSimpleGitTestContext({
                fixture: async () => {
                    const repo = await createRepoWithOrigin();
                    await repo.git.checkoutLocalBranch("other");
                    await repo.writeAndCommit(
                        "note.md",
                        "theirs\n",
                        "other change"
                    );
                    await repo.git.checkout("main");
                    repo.remove("note.md");
                    await repo.git.add("note.md");
                    await repo.git.commit("delete our copy");
                    await repo.git.merge(["other"]).catch(() => undefined);
                    return repo;
                },
            })
        );
        const view = Object.assign(Object.create(SplitDiffView.prototype), {
            plugin: { gitManager: manager },
        }) as SplitDiffView;

        await expect(view.gitShow("", "note.md")).resolves.toBe("");
    });

    it("reads stage 2 when it is the only conflict stage", async () => {
        const { manager, repo } = withCleanup(
            await createSimpleGitTestContext({
                fixture: async () => {
                    const repo = await createRepoWithOrigin();
                    await repo.git.checkoutLocalBranch("other");
                    mkdirSync(path.join(repo.repoPath, "folder"));
                    repo.write("folder/file.md", "theirs\n");
                    await repo.git.add("folder/file.md");
                    await repo.git.commit("add directory");
                    await repo.git.checkout("main");
                    repo.write("folder", "ours\n");
                    await repo.git.add("folder");
                    await repo.git.commit("add file");
                    await repo.git.merge(["other"]).catch(() => undefined);
                    return repo;
                },
            })
        );
        const view = Object.assign(Object.create(SplitDiffView.prototype), {
            plugin: { gitManager: manager },
        }) as SplitDiffView;

        expect(await repo.raw(["ls-files", "-u", "--", "folder~HEAD"])).toMatch(
            / 2\tfolder~HEAD$/
        );
        await expect(view.gitShow("", "folder~HEAD")).resolves.toBe("ours\n");
    });

    it("keeps reading stage 0 for a resolved file", async () => {
        const { manager, repo } = withCleanup(
            await createSimpleGitTestContext()
        );
        repo.write("note.md", "staged\n");
        await repo.git.add("note.md");
        const view = Object.assign(Object.create(SplitDiffView.prototype), {
            plugin: { gitManager: manager },
        }) as SplitDiffView;

        await expect(view.gitShow("", "note.md")).resolves.toBe("staged\n");
    });
});

function editorWithText(text: string) {
    return {
        state: {
            doc: { toString: () => text, length: text.length },
            update: vi.fn(() => ({})),
        },
        dispatch: vi.fn(),
    };
}

/**
 * Creates a view in a vault whose repository lives in the `repo` subfolder,
 * without running the constructor that registers workspace events.
 */
function createView(state: Partial<DiffViewState>) {
    const view = Object.create(SplitDiffView.prototype) as SplitDiffView;
    const read = vi.fn().mockResolvedValue("content");
    const write = vi.fn().mockResolvedValue(undefined);
    const fileSaveDebouncer = Object.assign(vi.fn(), { cancel: vi.fn() });
    const promiseQueue = new PromiseQueue();
    Object.assign(view, {
        refreshing: false,
        editRevision: 0,
        fileSaveDebouncer,
        state: { aRef: "HEAD", aFile: "note.md", bFile: "note.md", ...state },
        mergeView: { a: editorWithText("a"), b: editorWithText("content") },
        app: { vault: { adapter: { read, write } } },
        plugin: {
            promiseQueue,
            gitManager: {
                getRelativeVaultPath: (path: string) => `repo/${path}`,
            },
        },
    });
    return { view, read, write, promiseQueue };
}

describe("SplitDiffView", () => {
    it("matches the working tree file by its vault path", () => {
        const { view } = createView({ bRef: undefined });

        expect(view.isWorkingTreeBFile("repo/note.md")).toBe(true);
        expect(view.isWorkingTreeBFile("note.md")).toBe(false);
    });

    it("doesn't match files when b shows a git ref", () => {
        const { view } = createView({ bRef: "" });

        expect(view.isWorkingTreeBFile("repo/note.md")).toBe(false);
    });

    it("reads the working tree file by its vault path", async () => {
        const { view, read } = createView({ bRef: undefined });

        await view.updateModifiableEditor();

        expect(read).toHaveBeenCalledWith("repo/note.md");
    });

    it("keeps refreshing after reading the working tree file failed", async () => {
        const { view, read } = createView({ bRef: undefined });
        read.mockRejectedValueOnce(new Error("read failed"));

        await expect(view.updateModifiableEditor()).rejects.toThrow(
            "read failed"
        );

        expect(view.refreshing).toBe(false);
        await view.updateModifiableEditor();
        expect(read).toHaveBeenCalledTimes(2);
    });

    it("keeps refreshing after git show failed", async () => {
        const { view } = createView({ bRef: "" });
        const gitShow = vi
            .spyOn(view, "gitShow")
            .mockRejectedValueOnce(new Error("show failed"))
            .mockResolvedValue("a");

        await expect(view.updateRefEditors()).rejects.toThrow("show failed");

        expect(view.refreshing).toBe(false);
        await view.updateRefEditors();
        expect(gitShow).toHaveBeenCalledTimes(3);
    });

    it("translates the working tree and index titles", () => {
        const { view } = createView({ bRef: undefined });
        expect(view.getDisplayText()).toBe(
            t("Diff: {file} ({ref})", { file: "note", ref: t("Working Tree") })
        );
        view.state.bRef = "";
        expect(view.getDisplayText()).toBe(
            t("Diff: {file} ({ref})", { file: "note", ref: t("Index") })
        );
    });

    it("saves the captured vault path instead of a newly selected file", async () => {
        const { view, write } = createView({});
        view.scheduleFileSave(
            { vaultPath: "repo/note.md", savedContent: "content" },
            "edited"
        );
        view.state.bFile = "other.md";

        await view.flushPendingSave();

        expect(write).toHaveBeenCalledExactlyOnceWith("repo/note.md", "edited");
    });

    it("blocks a delayed save after a queued sync changes the file", async () => {
        const { view, read, write, promiseQueue } = createView({});
        promiseQueue.addTask(() => {
            read.mockResolvedValue("synced");
            return Promise.resolve();
        });
        view.scheduleFileSave(
            { vaultPath: "repo/note.md", savedContent: "content" },
            "edited"
        );

        await expect(view.flushPendingSave()).rejects.toThrow(
            t(
                "The file changed outside the diff editor. Save was blocked; copy your unsaved edits before reloading."
            )
        );
        expect(write).not.toHaveBeenCalled();
        // 写入被拒绝时，切换视图也必须保留旧编辑器和未保存内容。
        const previousState = view.state;
        await expect(
            view.setState(
                { ...view.state, bFile: "other.md" },
                { history: false }
            )
        ).rejects.toThrow();
        expect(view.state).toBe(previousState);
    });

    it("does not recreate a deleted file during a delayed save", async () => {
        const { view, read, write } = createView({});
        read.mockRejectedValue(new Error("file deleted"));
        view.scheduleFileSave(
            { vaultPath: "repo/note.md", savedContent: "content" },
            "edited"
        );

        await expect(view.flushPendingSave()).rejects.toThrow("file deleted");
        expect(write).not.toHaveBeenCalled();
    });

    it.each([
        "../outside.md",
        "/outside.md",
        "C:\\outside.md",
        "\\\\host\\file",
    ])(
        "rejects unsafe captured paths before reading or writing (%s)",
        async (vaultPath) => {
            const { view, read, write } = createView({});
            view.scheduleFileSave(
                { vaultPath, savedContent: "content" },
                "edited"
            );

            await expect(view.flushPendingSave()).rejects.toThrow(
                t("Cannot edit a file outside the vault.")
            );
            expect(read).not.toHaveBeenCalled();
            expect(write).not.toHaveBeenCalled();
        }
    );

    it("serializes successive edits using the last successful disk baseline", async () => {
        const { view, read, write } = createView({});
        let disk = "content";
        let finishFirstWrite!: () => void;
        const firstWrite = new Promise<void>((resolve) => {
            finishFirstWrite = resolve;
        });
        read.mockImplementation(() => Promise.resolve(disk));
        write.mockImplementation(async (_path: string, content: string) => {
            if (content === "first") await firstWrite;
            disk = content;
        });
        const target = {
            vaultPath: "repo/note.md",
            savedContent: "content",
        };
        view.scheduleFileSave(target, "first");
        const saving = view.flushPendingSave();
        await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(1));
        view.scheduleFileSave(target, "second");
        const savingAgain = view.flushPendingSave();
        finishFirstWrite();

        await Promise.all([saving, savingAgain]);

        expect(write.mock.calls).toEqual([
            ["repo/note.md", "first"],
            ["repo/note.md", "second"],
        ]);
        expect(disk).toBe("second");
        expect(target.savedContent).toBe("second");
    });

    it("does not replace unsaved edits with external refreshes", async () => {
        const { view, read } = createView({});
        const editor = view.mergeView!.b;
        view.scheduleFileSave(
            { vaultPath: "repo/note.md", savedContent: "content" },
            "edited"
        );

        await view.updateModifiableEditor();

        expect(read).not.toHaveBeenCalled();
        expect(editor.dispatch).not.toHaveBeenCalled();
    });

    it("ignores a refresh read that completes after the view switched", async () => {
        const { view, read } = createView({});
        vi.spyOn(view, "createMergeView").mockResolvedValue(undefined);
        let finishRead!: (content: string) => void;
        read.mockReturnValue(
            new Promise<string>((resolve) => {
                finishRead = resolve;
            })
        );
        const editor = view.mergeView!.b;
        const refreshing = view.updateModifiableEditor();
        view.state = { ...view.state, bFile: "other.md" };
        finishRead("external");

        await refreshing;

        expect(editor.dispatch).not.toHaveBeenCalled();
        expect(view.refreshing).toBe(false);
    });

    it("does not apply an external read after new edits were made", async () => {
        const { view, read } = createView({});
        let finishRead!: (content: string) => void;
        read.mockReturnValue(
            new Promise<string>((resolve) => {
                finishRead = resolve;
            })
        );
        const editor = view.mergeView!.b;
        const refreshing = view.updateModifiableEditor();
        view.scheduleFileSave(
            { vaultPath: "repo/note.md", savedContent: "content" },
            "edited"
        );
        finishRead("external");

        await refreshing;

        expect(editor.dispatch).not.toHaveBeenCalled();
    });

    it("ignores a stale refresh even if a newer edit has already been saved", async () => {
        const { view, read } = createView({});
        let finishRead!: (content: string) => void;
        read.mockReturnValueOnce(
            new Promise<string>((resolve) => {
                finishRead = resolve;
            })
        );
        const editor = view.mergeView!.b;
        const refreshing = view.updateModifiableEditor();
        view.scheduleFileSave(
            { vaultPath: "repo/note.md", savedContent: "content" },
            "edited"
        );
        await view.flushPendingSave();
        finishRead("content");

        await refreshing;

        expect(editor.dispatch).not.toHaveBeenCalled();
    });

    it("updates the save baseline after accepting an external refresh", async () => {
        const { view, read, write } = createView({});
        const target = {
            vaultPath: "repo/note.md",
            savedContent: "content",
        };
        Object.assign(view, { workingTreeSaveTarget: target });
        read.mockResolvedValue("external");

        await view.updateModifiableEditor();
        view.scheduleFileSave(target, "edited");
        await view.flushPendingSave();

        expect(write).toHaveBeenCalledExactlyOnceWith("repo/note.md", "edited");
    });

    it("keeps the editor intact if recreation cannot save pending changes", async () => {
        const { view, read } = createView({});
        const destroy = vi.fn();
        Object.assign(view.mergeView!, { destroy });
        read.mockResolvedValue("synced");
        view.scheduleFileSave(
            { vaultPath: "repo/note.md", savedContent: "content" },
            "edited"
        );

        await expect(view.createMergeView()).rejects.toThrow();
        expect(destroy).not.toHaveBeenCalled();
    });

    it("abandons a recreation snapshot if editing continues while loading", async () => {
        const { view } = createView({});
        const destroy = vi.fn();
        Object.assign(view.mergeView!, { destroy });
        vi.spyOn(view, "bShouldBeEditable").mockResolvedValue(true);
        let finishShow!: (content: string) => void;
        vi.spyOn(view, "gitShow").mockReturnValue(
            new Promise<string>((resolve) => {
                finishShow = resolve;
            })
        );
        const recreating = view.createMergeView();
        await vi.waitFor(() => expect(view.gitShow).toHaveBeenCalled());
        view.scheduleFileSave(
            { vaultPath: "repo/note.md", savedContent: "content" },
            "edited"
        );
        finishShow("a");
        Object.assign(view.app.vault.adapter, {
            exists: vi.fn().mockResolvedValue(true),
        });

        await recreating;

        expect(destroy).not.toHaveBeenCalled();
    });

    it("keeps pending edits available after a write fails", async () => {
        const { view, write } = createView({});
        write.mockRejectedValueOnce(new Error("write failed"));
        view.scheduleFileSave(
            { vaultPath: "repo/note.md", savedContent: "content" },
            "edited"
        );

        await expect(view.flushPendingSave()).rejects.toThrow("write failed");
        expect(view.ignoreNextModification).toBe(false);
        await view.flushPendingSave();
        expect(write).toHaveBeenCalledTimes(2);
    });
});

describe("MergeConflictModal rebase help", () => {
    function helpText(syncKind: "merge" | "rebase", conflicted: string[]) {
        const texts: string[] = [];
        const element = {
            addClass: vi.fn(),
            addEventListener: vi.fn(),
            createDiv: () => element,
            createEl: (_tag: string, options?: { text?: string }) => {
                if (options?.text) texts.push(options.text);
                return element;
            },
        };
        const modal = Object.assign(
            Object.create(MergeConflictModal.prototype),
            {
                plugin: { syncKind, cachedStatus: { conflicted } },
                contentEl: element,
                titleEl: { setText: (text: string) => texts.push(text) },
            }
        ) as MergeConflictModal;
        modal.onOpen();
        return texts.join("\n");
    }

    it.each([{ files: [] }, { files: ["note.md"] }])(
        "explains rebase continuation without recommending an ordinary commit ($files)",
        ({ files }) => {
            const text = helpText("rebase", files);
            expect(text).toContain("git rebase --continue");
            expect(text).toContain("git rebase --abort");
            expect(text).not.toContain(
                t(
                    "The merge is still active until you commit the staged changes."
                )
            );
            expect(text).not.toContain(
                t(
                    "After the Conflicts section is empty, enter a commit message and commit the staged changes. This finishes the merge. You can then push normally."
                )
            );
            if (files.length) {
                expect(text).toContain(
                    t(
                        "During rebase, ours is the branch being rebased onto and theirs is the commit being replayed. Review both sides carefully, or edit the conflict manually."
                    )
                );
            }
        }
    );

    it("still explains how an ordinary merge finishes", () => {
        expect(helpText("merge", [])).toContain(
            t(
                "After the Conflicts section is empty, enter a commit message and commit the staged changes. This finishes the merge. You can then push normally."
            )
        );
    });
});
