import { moment as obsidianMoment } from "obsidian";

// 保留宿主提供的实例；修正 Obsidian 命名空间声明在现代模块解析下不可调用的类型。
export const moment =
    obsidianMoment as unknown as typeof obsidianMoment.default;
