<script lang="ts">
    import { t } from "src/i18n";
    import { Menu, Scope, setIcon } from "obsidian";
    import { SOURCE_CONTROL_VIEW_CONFIG } from "src/constants";
    import type ObsidianGit from "src/main";
    import type {
        CommitMode,
        FileStatusResult,
        Status,
        StatusRootTreeItem,
    } from "src/types";
    import { FileType } from "src/types";
    import { arrayProxyWithNewLength, getDisplayPath } from "src/utils";
    import { slide } from "svelte/transition";
    import ConflictFileComponent from "./components/conflictFileComponent.svelte";
    import FileComponent from "./components/fileComponent.svelte";
    import PulledFileComponent from "./components/pulledFileComponent.svelte";
    import StagedFileComponent from "./components/stagedFileComponent.svelte";
    import TreeComponent from "./components/treeComponent.svelte";
    import type GitView from "./sourceControl";
    import TooManyFilesComponent from "./components/tooManyFilesComponent.svelte";
    import { onMount } from "svelte";
    import { getCommitAvailability } from "./commitAvailability";
    import { createCommitSubmission } from "./commitSubmission";

    interface Props {
        plugin: ObsidianGit;
        view: GitView;
    }

    let { plugin, view }: Props = $props();
    let loading: boolean = $state(false);
    let pending = $state(false);
    let repositoryMissing = $state(false);
    let setupInProgress = $state(false);
    let mergeInProgress = $state(false);
    let rebaseInProgress = $state(false);
    let status: Status | undefined = $state();
    let lastPulledFiles: FileStatusResult[] = $state([]);
    let commitMessage = $state("");
    let messageRevision = $state(0);
    let buttons: (HTMLElement | null)[] = $state([]);
    let changeHierarchy: StatusRootTreeItem | undefined = $state();
    let stagedHierarchy: StatusRootTreeItem | undefined = $state();
    let conflictHierarchy: StatusRootTreeItem | undefined = $state();
    let lastPulledFilesHierarchy: StatusRootTreeItem | undefined = $state();
    let changesOpen = $state(true);
    let stagedOpen = $state(true);
    let lastPulledFilesOpen = $state(true);
    let conflictsOpen = $state(true);
    let conflictCounts: Record<string, number> = $state({});
    let conflictCountUpdate: Promise<void> = Promise.resolve();
    let sortedConflicts = $derived(
        [...(status?.conflicted ?? [])].sort((a, b) => {
            const aResolved = conflictCounts[a] === 0 ? 0 : 1;
            const bResolved = conflictCounts[b] === 0 ? 0 : 1;
            if (aResolved !== bResolved) return aResolved - bResolved;
            return a.localeCompare(b);
        })
    );
    let unPushedCommits = $state(0);
    let stagedClosed: Record<string, boolean> = $state({});
    let unstagedClosed: Record<string, boolean> = $state({});
    let conflictsClosed: Record<string, boolean> = $state({});
    let pulledClosed: Record<string, boolean> = $state({});

    let stagedCount = $derived(
        (status?.staged.length ?? 0) + (status?.stagedOutsideVault ?? 0)
    );
    let changedCount = $derived(status?.changed.length ?? 0);
    let hasConflicts = $derived(
        (status?.conflicted.length ?? 0) +
            (status?.conflictedOutsideVault ?? 0) >
            0
    );
    let hasChanges = $derived(stagedCount + changedCount > 0);
    let commitDisabled = $derived(!canCommit("smart"));
    let commitAndSyncDisabled = $derived(!canCommitAndSync("all"));
    let syncBlocked = $derived(
        pending ||
            !status ||
            repositoryMissing ||
            hasConflicts ||
            mergeInProgress
    );
    let commitActionDescription = $derived(getCommitActionDescription(false));
    let commitAndSyncActionDescription = $derived(
        getCommitActionDescription(true)
    );

    let showTree = $derived(plugin.settings.treeStructure);
    onMount(() => {
        commitMessage = plugin.settings.commitMessage;
        repositoryMissing = plugin.repositoryMissing;
        view.registerEvent(
            view.app.workspace.on(
                "obsidian-git:loading-status",
                () => (loading = true)
            )
        );
        view.registerEvent(
            view.app.workspace.on(
                "obsidian-git:status-changed",
                () => void refresh().catch(console.error)
            )
        );
        view.registerEvent(
            view.app.workspace.on(
                "obsidian-git:repository-state-changed",
                () => {
                    repositoryMissing = plugin.repositoryMissing;
                    void refresh().catch(console.error);
                }
            )
        );
        const modifyEvent = view.app.vault.on("modify", (file) => {
            if (!status?.conflicted) {
                return;
            }
            const path = plugin.gitManager.getRelativeRepoPath(file.path);
            if (status?.conflicted.includes(path)) {
                void updateConflictCounts(path);
            }
        });
        if (view.plugin.cachedStatus == undefined) {
            view.plugin.refresh().catch(console.error);
        } else {
            refresh().catch(console.error);
        }

        view.scope = new Scope(plugin.app.scope);
        view.scope.register(["Ctrl"], "Enter", (_: KeyboardEvent) =>
            commitAndSync()
        );

        return () => view.app.vault.offref(modifyEvent);
    });
    $effect(() => {
        buttons.forEach((btn) => {
            if (btn) setIcon(btn, btn.getAttr("data-icon")!);
        });
    });

    function getCommitActionDescription(sync: boolean): string {
        if (rebaseInProgress) {
            return t(
                "Rebase is in progress. Do not use ordinary commit commands. Resolve and stage conflicts, then run native Git `git rebase --continue`, or use `git rebase --abort` to abort."
            );
        }
        if (!status || repositoryMissing) return t("Git is not ready");
        if (hasConflicts) {
            return t("Resolve conflicts before committing");
        }
        if (mergeInProgress && !hasChanges) {
            return sync ? t("Finish merge and sync") : t("Finish merge");
        }
        if (!hasChanges) {
            return sync
                ? t("Sync (no changes to commit)")
                : t("No changes to commit");
        }
        if (sync) {
            return t("Commit all changes and sync");
        }
        if (stagedCount > 0) {
            return t("Commit {n} staged file(s)", { n: stagedCount });
        }
        if (!plugin.settings.autoStageOnEmptyIndex) {
            return t("Nothing staged - stage changes before committing");
        }
        return t("Stage and commit all {n} changed file(s)", {
            n: changedCount,
        });
    }

    function canCommit(mode: CommitMode): boolean {
        return commitAvailability()[mode];
    }

    function canCommitAndSync(mode: "staged" | "all"): boolean {
        const availability = commitAvailability();
        return mode === "all" ? availability.syncAll : availability.syncStaged;
    }

    function commitAvailability() {
        return getCommitAvailability({
            ready: !!status && plugin.gitReady && !repositoryMissing,
            pending,
            hasConflicts,
            rebaseInProgress: rebaseInProgress || plugin.syncKind === "rebase",
            mergeInProgress,
            stagedCount,
            changedCount,
            autoStageOnEmptyIndex: plugin.settings.autoStageOnEmptyIndex,
        });
    }

    const commitSubmission = createCommitSubmission({
        get queue() {
            return plugin.promiseQueue;
        },
        getDraft: () => ({ message: commitMessage, revision: messageRevision }),
        setPending: (value) => (pending = value),
        clearMessage: () => (commitMessage = ""),
        refresh: triggerRefresh,
        run: (snapshot) =>
            snapshot.kind === "sync"
                ? plugin.gitActions.commitAndSync({
                      fromAutoBackup: false,
                      commitMessage: snapshot.commitMessage,
                      mode: snapshot.mode,
                  })
                : plugin.gitActions.commit({
                      fromAuto: false,
                      commitMessage: snapshot.commitMessage,
                      mode: snapshot.mode,
                      amend: snapshot.amend,
                  }),
    });

    function commit(mode: CommitMode = "smart") {
        if (!canCommit(mode)) return;
        commitSubmission.submit({ kind: "commit", mode });
    }

    function amendStaged() {
        if (!canCommit("staged")) return;
        commitSubmission.submit({
            kind: "commit",
            mode: "staged",
            amend: true,
        });
    }

    function commitAndSync(mode: "staged" | "all" = "all") {
        if (!canCommitAndSync(mode)) return;
        commitSubmission.submit({ kind: "sync", mode });
    }

    function showCommitMenu(event: MouseEvent) {
        event.stopPropagation();
        const menu = Menu.forEvent(event);
        menu.addItem((item) =>
            item
                .setTitle(t("Commit staged"))
                .setIcon("git-commit")
                .setDisabled(!canCommit("staged"))
                .onClick(() => commit("staged"))
        );
        menu.addItem((item) =>
            item
                .setTitle(t("Stage all and commit"))
                .setIcon("list-plus")
                .setDisabled(!canCommit("all"))
                .onClick(() => commit("all"))
        );
        menu.addItem((item) =>
            item
                .setTitle(t("Amend staged"))
                .setIcon("git-commit")
                .setDisabled(!canCommit("staged"))
                .onClick(amendStaged)
        );
        menu.addSeparator();
        menu.addItem((item) =>
            item
                .setTitle(t("Commit staged and sync"))
                .setIcon("arrow-up-circle")
                .setDisabled(!canCommitAndSync("staged"))
                .onClick(() => commitAndSync("staged"))
        );
        menu.showAtMouseEvent(event);
    }

    async function refresh(): Promise<void> {
        if (!plugin.gitReady) {
            status = undefined;
            loading = false;
            return;
        }
        unPushedCommits = await plugin.getUnpushedCommits();

        status = plugin.cachedStatus;
        mergeInProgress = plugin.state.mergeInProgress;
        rebaseInProgress = plugin.syncKind === "rebase";
        loading = false;
        if (
            plugin.lastPulledFiles &&
            plugin.lastPulledFiles != lastPulledFiles
        ) {
            lastPulledFiles = plugin.lastPulledFiles;

            lastPulledFilesHierarchy = {
                title: "",
                path: "",
                vaultPath: "",
                children: plugin.gitManager.getTreeStructure(
                    lastPulledFiles,
                    plugin.settings.limitToVault ? "vault" : "repository"
                ),
            };
        }
        if (status) {
            const sort = (a: FileStatusResult, b: FileStatusResult) => {
                return a.vaultPath
                    .split("/")
                    .last()!
                    .localeCompare(getDisplayPath(b.vaultPath));
            };
            status.changed.sort(sort);
            status.staged.sort(sort);
            changeHierarchy = {
                title: "",
                path: "",
                vaultPath: "",
                children: plugin.gitManager.getTreeStructure(
                    status.changed,
                    plugin.settings.limitToVault ? "vault" : "repository"
                ),
            };
            stagedHierarchy = {
                title: "",
                path: "",
                vaultPath: "",
                children: plugin.gitManager.getTreeStructure(
                    status.staged,
                    plugin.settings.limitToVault ? "vault" : "repository"
                ),
            };
            conflictHierarchy = {
                title: "",
                path: "",
                vaultPath: "",
                children: plugin.gitManager.getTreeStructure(
                    status.conflicted.map((path) => ({
                        path,
                        vaultPath: plugin.gitManager.getRelativeVaultPath(path),
                        index: "U",
                        workingDir: "U",
                    }))
                ),
            };
        } else {
            changeHierarchy = undefined;
            stagedHierarchy = undefined;
            conflictHierarchy = undefined;
        }
        await updateConflictCounts();
    }

    // Serialize updates so concurrent file saves cannot overwrite newer counts.
    function updateConflictCounts(path?: string): Promise<void> {
        const update = conflictCountUpdate.then(() =>
            performConflictCountUpdate(path)
        );
        conflictCountUpdate = update.catch(() => undefined);
        return update;
    }

    async function performConflictCountUpdate(path?: string): Promise<void> {
        const targets = path ? [path] : (status?.conflicted ?? []);
        const counts = path ? { ...conflictCounts } : {};
        for (const conflict of targets) {
            counts[conflict] = 0;
            try {
                const content = await view.app.vault.adapter.read(
                    plugin.gitManager.getRelativeVaultPath(conflict)
                );
                counts[conflict] = countConflictSections(content);
            } catch {
                // The file may be deleted on one side; nothing to resolve.
            }
        }
        conflictCounts = counts;
    }

    function countConflictSections(content: string): number {
        return (content.match(/^<{7}/gm) ?? []).length;
    }

    function triggerRefresh() {
        view.app.workspace.trigger("obsidian-git:refresh");
    }

    function runSetupAction(action: () => Promise<unknown>) {
        if (setupInProgress) return;
        setupInProgress = true;
        plugin.promiseQueue.addTask(action, () => {
            setupInProgress = false;
        });
    }

    function stageAll(event: MouseEvent) {
        event.stopPropagation();
        loading = true;
        plugin.promiseQueue.addTask(() => plugin.gitActions.stageAll());
    }

    function unstageAll(event: MouseEvent) {
        event.stopPropagation();
        loading = true;
        plugin.promiseQueue.addTask(() => plugin.gitActions.unstageAll());
    }

    function push() {
        if (syncBlocked || plugin.syncKind !== "none") return;
        loading = true;
        plugin.promiseQueue.addTask(() =>
            plugin.gitActions.push().finally(triggerRefresh)
        );
    }
    function pull() {
        if (syncBlocked || plugin.syncKind !== "none") return;
        loading = true;
        plugin.promiseQueue.addTask(() =>
            plugin.gitActions.pullChangesFromRemote().finally(triggerRefresh)
        );
    }
    function discard(event: Event) {
        event.stopPropagation();
        plugin.promiseQueue.addTask(() => plugin.gitActions.discardAll());
    }

    let rows = $derived((commitMessage.match(/\n/g) || []).length + 1 || 1);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<main
    data-type={SOURCE_CONTROL_VIEW_CONFIG.type}
    class="git-view gitcn-source-control"
    class:repository-missing={repositoryMissing}
>
    {#if repositoryMissing}
        <div class="repository-notice">
            <p>{t("No Git repository found.")}</p>
            <div class="repository-actions">
                <button
                    class="mod-cta"
                    disabled={setupInProgress}
                    onclick={() =>
                        runSetupAction(() => plugin.gitActions.createNewRepo())}
                    >{t("Initialize repository")}</button
                >
                <button
                    disabled={setupInProgress}
                    onclick={() =>
                        runSetupAction(() => plugin.gitActions.cloneNewRepo())}
                    >{t("Clone repository")}</button
                >
            </div>
        </div>
    {/if}
    <div class="gitcn-header">
        <span class="gitcn-title">{plugin.manifest.name}</span>
        <div
            class="gitcn-toolbar"
            role="toolbar"
            aria-label={t("Repository actions")}
        >
            <button
                type="button"
                id="push"
                class="clickable-icon gitcn-icon-button"
                class:has-unpushed={unPushedCommits > 0}
                aria-label={t("Push")}
                disabled={syncBlocked}
                onclick={push}
                ><span
                    data-icon="upload"
                    bind:this={buttons[4]}
                    aria-hidden="true"
                ></span></button
            >
            <button
                type="button"
                id="pull"
                class="clickable-icon gitcn-icon-button"
                aria-label={t("Pull")}
                disabled={syncBlocked}
                onclick={pull}
                ><span
                    data-icon="download"
                    bind:this={buttons[5]}
                    aria-hidden="true"
                ></span></button
            >
            <span class="gitcn-toolbar-divider" aria-hidden="true"></span>
            <button
                type="button"
                id="layoutChange"
                class="clickable-icon gitcn-icon-button"
                aria-label={t("Change Layout")}
                onclick={() => {
                    showTree = !showTree;
                    if (buttons[6])
                        setIcon(buttons[6], showTree ? "list" : "folder");
                    plugin.settings.treeStructure = showTree;
                    void plugin.saveSettings();
                }}
                ><span
                    data-icon={showTree ? "list" : "folder"}
                    bind:this={buttons[6]}
                    aria-hidden="true"
                ></span></button
            >
            <button
                type="button"
                id="refresh"
                class="clickable-icon gitcn-icon-button"
                aria-label={t("Refresh")}
                onclick={triggerRefresh}
                ><span
                    data-icon="refresh-cw"
                    class:loading
                    bind:this={buttons[7]}
                    aria-hidden="true"
                ></span></button
            >
        </div>
    </div>
    <div class="gitcn-composer">
        <div class="gitcn-message-field">
            <textarea
                {rows}
                class="gitcn-message-input"
                spellcheck="true"
                aria-label={t("Commit Message")}
                placeholder={t("Commit Message")}
                oninput={() => messageRevision++}
                bind:value={commitMessage}></textarea>
            {#if commitMessage}
                <button
                    type="button"
                    class="clickable-icon gitcn-icon-button gitcn-clear-message"
                    onclick={() => {
                        messageRevision++;
                        commitMessage = "";
                    }}
                    aria-label={t("Clear")}
                    ><svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        aria-hidden="true"
                        ><path d="m6 6 12 12M6 18 18 6" /></svg
                    ></button
                >
            {/if}
        </div>
        <div class="gitcn-commit-actions">
            <button
                type="button"
                id="backup-btn"
                class="mod-cta gitcn-sync-button"
                disabled={commitAndSyncDisabled}
                aria-label={commitAndSyncActionDescription}
                onclick={() => commitAndSync()}
                ><span
                    data-icon="arrow-up-circle"
                    bind:this={buttons[0]}
                    aria-hidden="true"
                ></span><span>{t("Sync")}</span></button
            >
            <div class="gitcn-commit-group">
                <button
                    type="button"
                    id="commit-btn"
                    class="gitcn-commit-button"
                    disabled={commitDisabled}
                    aria-label={commitActionDescription}
                    onclick={() => commit()}
                    ><span
                        data-icon="check"
                        bind:this={buttons[1]}
                        aria-hidden="true"
                    ></span><span>{t("Commit")}</span></button
                >
                <button
                    type="button"
                    id="commit-menu"
                    class="gitcn-menu-button"
                    disabled={pending}
                    aria-label={t("More commit actions")}
                    onclick={showCommitMenu}
                    ><span
                        data-icon="chevron-down"
                        bind:this={buttons[10]}
                        aria-hidden="true"
                    ></span></button
                >
            </div>
        </div>
        {#if mergeInProgress}
            <button
                type="button"
                id="merge-status"
                class="gitcn-merge-status"
                aria-label={rebaseInProgress
                    ? t("Rebase in progress")
                    : t("Merge in progress - select for help")}
                onclick={() => plugin.openMergeConflictHelp()}
                ><span
                    data-icon="git-merge"
                    bind:this={buttons[11]}
                    aria-hidden="true"
                ></span><span>{t("Merge in progress - select for help")}</span
                ></button
            >
        {/if}
    </div>

    <div class="nav-files-container" style="position: relative;">
        {#if status && !hasChanges && !hasConflicts && !mergeInProgress && !rebaseInProgress && !loading && !pending}
            <div class="gitcn-empty-state" role="status">
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                    ><circle cx="12" cy="12" r="9" /><path
                        d="m8 12 2.5 2.5L16 9"
                    /></svg
                >
                <p>{t("No changes to commit")}</p>
                <span
                    >{t(
                        "Changes will appear here as you edit your notes."
                    )}</span
                >
            </div>
        {/if}
        {#if status && status.conflicted.length > 0}
            <div
                class="conflicts tree-item nav-folder"
                class:is-collapsed={!conflictsOpen}
            >
                <div
                    class="tree-item-self is-clickable nav-folder-title"
                    onclick={() => (conflictsOpen = !conflictsOpen)}
                >
                    <div
                        class="tree-item-icon nav-folder-collapse-indicator collapse-icon"
                        class:is-collapsed={!conflictsOpen}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="svg-icon right-triangle"
                            ><path d="M3 8L12 17L21 8" /></svg
                        >
                    </div>
                    <div class="tree-item-inner nav-folder-title-content">
                        {t("Conflicts")}
                    </div>
                    <div class="git-tools">
                        <div class="files-count">
                            {status.conflicted.length}
                        </div>
                    </div>
                </div>
                {#if conflictsOpen}
                    <div
                        class="tree-item-children nav-folder-children"
                        transition:slide|local={{ duration: 150 }}
                    >
                        {#if showTree && conflictHierarchy}
                            <TreeComponent
                                hierarchy={conflictHierarchy}
                                {plugin}
                                {view}
                                fileType={FileType.conflicted}
                                {conflictCounts}
                                topLevel={true}
                                bind:closed={conflictsClosed}
                            />
                        {:else}
                            {#each sortedConflicts as conflict}
                                <ConflictFileComponent
                                    path={conflict}
                                    count={conflictCounts[conflict]}
                                    {view}
                                    manager={plugin.gitManager}
                                />
                            {/each}
                        {/if}
                    </div>
                {/if}
            </div>
        {/if}

        {#if status && stagedHierarchy && changeHierarchy}
            <div class="tree-item nav-folder mod-root">
                {#if status.staged.length > 0}
                    <div
                        class="staged tree-item nav-folder"
                        class:is-collapsed={!stagedOpen}
                    >
                        <div
                            class="tree-item-self is-clickable nav-folder-title"
                            onclick={() => (stagedOpen = !stagedOpen)}
                        >
                            <div
                                class="tree-item-icon nav-folder-collapse-indicator collapse-icon"
                                class:is-collapsed={!stagedOpen}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    class="svg-icon right-triangle"
                                    ><path d="M3 8L12 17L21 8" /></svg
                                >
                            </div>
                            <div
                                class="tree-item-inner nav-folder-title-content"
                            >
                                {t("Staged Changes")}
                            </div>

                            <div class="git-tools">
                                <div class="buttons">
                                    <div
                                        data-icon="minus"
                                        id="unstage-all"
                                        aria-label={t("Unstage all")}
                                        bind:this={buttons[8]}
                                        onclick={unstageAll}
                                        class="clickable-icon"
                                    >
                                        <svg
                                            width="18"
                                            height="18"
                                            viewBox="0 0 18 18"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            class="svg-icon lucide-minus"
                                            ><line
                                                x1="4"
                                                y1="9"
                                                x2="14"
                                                y2="9"
                                            /></svg
                                        >
                                    </div>
                                </div>
                                <div class="files-count">
                                    {status.staged.length}
                                </div>
                            </div>
                        </div>
                        {#if stagedOpen}
                            <div
                                class="tree-item-children nav-folder-children"
                                transition:slide|local={{ duration: 150 }}
                            >
                                {#if showTree}
                                    <TreeComponent
                                        hierarchy={stagedHierarchy}
                                        {plugin}
                                        {view}
                                        fileType={FileType.staged}
                                        topLevel={true}
                                        bind:closed={stagedClosed}
                                    />
                                {:else}
                                    {#each arrayProxyWithNewLength(status.staged, 500) as stagedFile}
                                        <StagedFileComponent
                                            change={stagedFile}
                                            {view}
                                        />
                                    {/each}
                                    <TooManyFilesComponent
                                        files={status.staged}
                                    />
                                {/if}
                            </div>
                        {/if}
                    </div>
                {/if}
                {#if status.stagedOutsideVault > 0}
                    <div class="staged tree-item nav-folder">
                        <div class="tree-item-self nav-folder-title">
                            <div
                                class="tree-item-inner nav-folder-title-content"
                            >
                                {t("Staged outside vault")}
                            </div>
                            <div class="git-tools">
                                <div class="files-count">
                                    {status.stagedOutsideVault}
                                </div>
                            </div>
                        </div>
                    </div>
                {/if}
                {#if status.conflictedOutsideVault > 0}
                    <div class="changes tree-item nav-folder">
                        <div class="tree-item-self nav-folder-title">
                            <div
                                class="tree-item-inner nav-folder-title-content"
                            >
                                {t("Conflicts outside vault")}
                            </div>
                            <div class="git-tools">
                                <div class="files-count">
                                    {status.conflictedOutsideVault}
                                </div>
                            </div>
                        </div>
                    </div>
                {/if}
                {#if status.changed.length > 0}
                    <div
                        class="changes tree-item nav-folder"
                        class:is-collapsed={!changesOpen}
                    >
                        <div
                            onclick={() => (changesOpen = !changesOpen)}
                            class="tree-item-self is-clickable nav-folder-title"
                        >
                            <div
                                class="tree-item-icon nav-folder-collapse-indicator collapse-icon"
                                class:is-collapsed={!changesOpen}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    class="svg-icon right-triangle"
                                    ><path d="M3 8L12 17L21 8" /></svg
                                >
                            </div>

                            <div
                                class="tree-item-inner nav-folder-title-content"
                            >
                                {t("Changes")}
                            </div>
                            <div class="git-tools">
                                <div class="buttons">
                                    <div
                                        data-icon="undo"
                                        aria-label={t("Discard")}
                                        onclick={discard}
                                        class="clickable-icon"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="24"
                                            height="24"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            class="svg-icon lucide-undo"
                                            ><path d="M3 7v6h6" /><path
                                                d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"
                                            /></svg
                                        >
                                    </div>
                                    <div
                                        data-icon="plus"
                                        id="stage-all"
                                        aria-label={t("Stage all")}
                                        bind:this={buttons[9]}
                                        onclick={stageAll}
                                        class="clickable-icon"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="24"
                                            height="24"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            class="svg-icon lucide-plus"
                                            ><line
                                                x1="12"
                                                y1="5"
                                                x2="12"
                                                y2="19"
                                            /><line
                                                x1="5"
                                                y1="12"
                                                x2="19"
                                                y2="12"
                                            /></svg
                                        >
                                    </div>
                                </div>
                                <div class="files-count">
                                    {status.changed.length}
                                </div>
                            </div>
                        </div>
                        {#if changesOpen}
                            <div
                                class="tree-item-children nav-folder-children"
                                transition:slide|local={{ duration: 150 }}
                            >
                                {#if showTree}
                                    <TreeComponent
                                        hierarchy={changeHierarchy}
                                        {plugin}
                                        {view}
                                        fileType={FileType.changed}
                                        topLevel={true}
                                        bind:closed={unstagedClosed}
                                    />
                                {:else}
                                    {#each arrayProxyWithNewLength(status.changed, 500) as change}
                                        <FileComponent {change} {view} />
                                    {/each}
                                    <TooManyFilesComponent
                                        files={status.changed}
                                    />
                                {/if}
                            </div>
                        {/if}
                    </div>
                {/if}
                {#if lastPulledFiles.length > 0 && lastPulledFilesHierarchy}
                    <div
                        class="pulled nav-folder"
                        class:is-collapsed={!lastPulledFilesOpen}
                    >
                        <div
                            class="tree-item-self is-clickable nav-folder-title"
                            onclick={() =>
                                (lastPulledFilesOpen = !lastPulledFilesOpen)}
                        >
                            <div
                                class="tree-item-icon nav-folder-collapse-indicator collapse-icon"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    class="svg-icon right-triangle"
                                    ><path d="M3 8L12 17L21 8" /></svg
                                >
                            </div>

                            <div
                                class="tree-item-inner nav-folder-title-content"
                            >
                                {t("Recently Pulled Files")}
                            </div>

                            <span class="tree-item-flair"
                                >{lastPulledFiles.length}</span
                            >
                        </div>
                        {#if lastPulledFilesOpen}
                            <div
                                class="tree-item-children nav-folder-children"
                                transition:slide|local={{ duration: 150 }}
                            >
                                {#if showTree}
                                    <TreeComponent
                                        hierarchy={lastPulledFilesHierarchy}
                                        {plugin}
                                        {view}
                                        fileType={FileType.pulled}
                                        topLevel={true}
                                        bind:closed={pulledClosed}
                                    />
                                {:else}
                                    {#each lastPulledFiles as change}
                                        <PulledFileComponent {change} {view} />
                                    {/each}
                                    <TooManyFilesComponent
                                        files={lastPulledFiles}
                                    />
                                {/if}
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</main>

<style lang="scss">
    .conflicts {
        --nav-indentation-guide-color: var(--text-warning);
        --collapse-icon-color: var(--text-warning);
        --collapse-icon-color-collapsed: var(--text-warning);

        > .nav-folder-title {
            color: var(--text-warning);
        }

        .nav-folder-collapse-indicator,
        .nav-folder-collapse-indicator svg,
        :global(.topLevel .nav-folder-collapse-indicator),
        :global(.topLevel .nav-folder-collapse-indicator svg) {
            color: var(--text-warning);
        }

        .tree-item-children {
            border-inline-start-color: var(--text-warning);
        }
    }
</style>
