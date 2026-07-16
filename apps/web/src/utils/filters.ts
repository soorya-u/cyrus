import type { AvailableCommand } from "@cyrus/schemas/rtc/catalog";
import { matchSorter } from "match-sorter";

export function filterNamedItems<T extends { name: string }>(
	items: readonly T[],
	query: string
): T[] {
	return matchSorter(items, query.trim(), { keys: ["name"] });
}

export function filterSlashCommands(
	commands: readonly AvailableCommand[],
	query: string
): AvailableCommand[] {
	return matchSorter(commands, query.trim(), {
		keys: ["name", "description"],
	});
}
