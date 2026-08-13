import type { App } from "obsidian";
import { Modal } from "obsidian";
import { t } from "src/i18n";

export type DiscardResult = false | "delete" | "discard";

export class DiscardModal extends Modal {
    path: string;
    deleteCount: number;
    discardCount: number;
    constructor({
        app,
        path,
        filesToDeleteCount,
        filesToDiscardCount,
    }: {
        app: App;
        path: string;
        filesToDeleteCount: number;
        filesToDiscardCount: number;
    }) {
        super(app);
        this.path = path;
        this.deleteCount = filesToDeleteCount;
        this.discardCount = filesToDiscardCount;
    }
    resolve: ((value: DiscardResult) => void) | null = null;

    /**
     * @returns the result of the modal, whcih can be:
     *   - `false` if the user canceled the modal
     *   - `"delete"` if the user chose to delete all files. In case there are also tracked files, they will be discarded as well.
     *   - `"discard"` if the user chose to discard all tracked files. Untracked files will not be deleted.
     */
    openAndGetResult(): Promise<DiscardResult> {
        this.open();
        return new Promise<DiscardResult>((resolve) => {
            this.resolve = resolve;
        });
    }

    onOpen() {
        const sum = this.deleteCount + this.discardCount;
        const { contentEl, titleEl } = this;
        let titlePart = "";
        if (this.path != "") {
            if (sum > 1) {
                titlePart = t('files in "{path}"', { path: this.path });
            } else {
                titlePart = `"${this.path}"`;
            }
        }
        titleEl.setText(
            `${this.discardCount == 0 ? t("Delete") : t("Discard")} ${titlePart}`
        );
        if (this.deleteCount > 0) {
            contentEl
                .createEl("p")
                .setText(
                    t(
                        "Are you sure you want to DELETE the {n} untracked file(s)? They are deleted according to your Obsidian trash setting.",
                        { n: this.deleteCount }
                    )
                );
        }
        if (this.discardCount > 0) {
            contentEl
                .createEl("p")
                .setText(
                    t(
                        "Are you sure you want to discard ALL changes in {n} tracked file(s)?",
                        { n: this.discardCount }
                    )
                );
        }
        const div = contentEl.createDiv({ cls: "modal-button-container" });

        if (this.deleteCount > 0) {
            const discardAndDelete = div.createEl("button", {
                cls: "mod-warning",
                text: t("{action} all {n} file(s)", {
                    action: this.discardCount > 0 ? t("Discard") : t("Delete"),
                    n: sum,
                }),
            });
            discardAndDelete.addEventListener("click", () => {
                if (this.resolve) this.resolve("delete");
                this.close();
            });
            discardAndDelete.addEventListener("keypress", () => {
                if (this.resolve) this.resolve("delete");
                this.close();
            });
        }

        if (this.discardCount > 0) {
            const discard = div.createEl("button", {
                cls: "mod-warning",
                text: t("Discard all {n} tracked file(s)", {
                    n: this.discardCount,
                }),
            });
            discard.addEventListener("click", () => {
                if (this.resolve) this.resolve("discard");
                this.close();
            });
            discard.addEventListener("keypress", () => {
                if (this.resolve) this.resolve("discard");
                this.close();
            });
        }

        const close = div.createEl("button", {
            text: t("Cancel"),
        });
        close.addEventListener("click", () => {
            if (this.resolve) this.resolve(false);
            return this.close();
        });
        close.addEventListener("keypress", () => {
            if (this.resolve) this.resolve(false);
            return this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
