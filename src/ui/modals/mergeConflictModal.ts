import { Modal } from "obsidian";
import { t } from "src/i18n";
import type ObsidianGit from "src/main";

export class MergeConflictModal extends Modal {
    constructor(private readonly plugin: ObsidianGit) {
        super(plugin.app);
    }

    onOpen(): void {
        const { contentEl, titleEl } = this;
        const conflicts = this.plugin.cachedStatus?.conflicted ?? [];
        const isRebase = this.plugin.syncKind === "rebase";

        titleEl.setText(
            isRebase ? t("Rebase in progress") : t("Merge in progress")
        );
        contentEl.addClass("obsidian-git-merge-help");
        contentEl.createEl("p", {
            text: isRebase
                ? t(
                      "Rebase is in progress. Do not use ordinary commit commands. Resolve and stage conflicts, then run native Git `git rebase --continue`, or use `git rebase --abort` to abort."
                  )
                : t(
                      "Git is combining the version in your vault with changes from another version. The merge must be committed before Gitcn can push or resume automatic commits."
                  ),
        });

        if (conflicts.length > 0) {
            contentEl.createEl("h3", { text: t("Resolve the conflicts") });
            contentEl.createEl("p", {
                text: t(
                    "Git could not combine some parts automatically. Open each conflicted file and review every highlighted conflict block."
                ),
            });

            const steps = contentEl.createEl("ol");
            steps.createEl("li", {
                text: isRebase
                    ? t(
                          "During rebase, ours is the branch being rebased onto and theirs is the commit being replayed. Review both sides carefully, or edit the conflict manually."
                      )
                    : t(
                          "Choose {ours} for your local text, {theirs} for the incoming text, {both}, or edit the block manually.",
                          {
                              ours: t("Keep ours"),
                              theirs: t("Keep theirs"),
                              both: t("Keep both"),
                          }
                      ),
            });
            steps.createEl("li", {
                text: t(
                    "When the file's conflict count reaches zero, select the plus icon next to it to mark it as resolved."
                ),
            });
            steps.createEl("li", {
                text: t("Repeat this for every file in the Conflicts section."),
            });
        } else {
            const resolved = contentEl.createDiv({
                cls: "obsidian-git-merge-help-resolved",
            });
            resolved.createEl("strong", {
                text: t("All conflicts have been marked as resolved."),
            });
            resolved.createEl("div", {
                text: isRebase
                    ? t(
                          "The rebase is still active. Run `git rebase --continue` after staging the resolved files; further commits may have conflicts."
                      )
                    : t(
                          "The merge is still active until you commit the staged changes."
                      ),
            });
        }

        contentEl.createEl("h3", {
            text: isRebase ? t("Continue the rebase") : t("Finish the merge"),
        });
        contentEl.createEl("p", {
            text: isRebase
                ? t(
                      "The rebase is still active. Run `git rebase --continue` after staging the resolved files; further commits may have conflicts."
                  )
                : t(
                      "After the Conflicts section is empty, enter a commit message and commit the staged changes. This finishes the merge. You can then push normally."
                  ),
        });

        const buttons = contentEl.createDiv({ cls: "modal-button-container" });
        const close = buttons.createEl("button", {
            cls: "mod-cta",
            text: t("Got it"),
        });
        close.addEventListener("click", () => this.close());
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
