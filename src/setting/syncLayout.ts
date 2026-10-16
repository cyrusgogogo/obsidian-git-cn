import type {
    SettingDefinition,
    SettingDefinitionGroup,
    SettingDefinitionItem,
    SettingDefinitionPage,
} from "obsidian";
import { t } from "src/i18n";

export function flattenSettings(
    items: SettingDefinitionItem[]
): SettingDefinition[] {
    return items.flatMap((item) =>
        "type" in item ? flattenSettings(item.items ?? []) : [item]
    );
}

// 复用原生控件定义，保留搜索、校验、禁用条件和 setControlValue 写入路径。
export function layoutSyncPage(
    items: SettingDefinitionItem[],
    summary: SettingDefinition,
    manual: SettingDefinition,
    safety: SettingDefinition
): SettingDefinitionItem[] {
    const syncPage = items.find(
        (item): item is SettingDefinitionPage =>
            "type" in item &&
            item.type === "page" &&
            item.name === t("Sync Triggers")
    );
    const pullPage = items.find(
        (item): item is SettingDefinitionPage =>
            "type" in item &&
            item.type === "page" &&
            item.name === t("Pull Strategy")
    );
    if (!syncPage?.items || !pullPage?.items) return items;

    const original = syncPage.items;
    const pullSettings = flattenSettings(pullPage.items);
    const selectPull = (key: string) =>
        pullSettings.filter((item) => item.control?.key === key);
    const timerKeys = new Set([
        "differentIntervalCommitAndPush",
        "autoSaveInterval",
        "autoBackupAfterFileChange",
        "setLastSaveToLastCommit",
        "autoPushInterval",
        "autoPullInterval",
    ]);
    const isTimer = (item: SettingDefinitionItem) =>
        !("type" in item) &&
        item.control !== undefined &&
        timerKeys.has(item.control.key);
    const card = (
        heading: string,
        id: string,
        definitions: SettingDefinition[]
    ): SettingDefinitionGroup => ({
        type: "group",
        heading,
        cls: `git-settings-trigger-card git-settings-trigger-${id}`,
        items: definitions,
    });

    return items.map((item) =>
        item !== syncPage
            ? item
            : {
                  ...syncPage,
                  name: t("Automatic sync"),
                  desc: t("Focus on writing; configure when Git runs below."),
                  items: [
                      summary,
                      card(t("Manual sync"), "manual", [manual]),
                      card(t("Scheduled execution"), "scheduled", [
                          {
                              name: t("Scheduled execution"),
                              desc: t(
                                  "Zero disables each timer. The commit interval follows the editing or fixed-interval preference. A separate push timer requires split timers."
                              ),
                          },
                          ...flattenSettings(original.filter(isTimer)),
                      ]),
                      card(
                          t("Pull on opening the vault"),
                          "boot",
                          selectPull("autoPullOnBoot")
                      ),
                      card(t("Push after commit-and-sync"), "push", [
                          ...selectPull("pushOnCommitAndSync"),
                          {
                              name: t("Push after commit-and-sync"),
                              desc: t(
                                  "This controls push in commit-and-sync, not every manual commit. Split automatic commits do not push; use the separate push timer."
                              ),
                          },
                      ]),
                      {
                          type: "group",
                          heading: t("Automatic commit preferences"),
                          cls: "git-settings-automatic-preferences",
                          items: flattenSettings(
                              original.filter((entry) => !isTimer(entry))
                          ),
                      },
                      {
                          type: "group",
                          heading: t("Pull strategy"),
                          cls: "git-settings-pull-strategy",
                          items: [
                              ...selectPull("syncMethod"),
                              ...selectPull("rebaseAutoStash"),
                              safety,
                          ],
                      },
                  ],
              }
    );
}
