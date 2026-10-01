import type { FileTreeBatchOperation } from "@pierre/trees";

function pathDepth(path: string): number {
	return path.split("/").filter(Boolean).length;
}

/** Diffs two path lists (directories end in `/`) into tree batch operations. */
export function buildFileTreePathUpdates(
	previousPaths: readonly string[],
	nextPaths: readonly string[]
): FileTreeBatchOperation[] {
	const previous = new Set(previousPaths);
	const next = new Set(nextPaths);
	const removedDirectories: string[] = [];
	const updates: FileTreeBatchOperation[] = [];

	const removed = previousPaths
		.filter((path) => !next.has(path))
		.sort((left, right) => pathDepth(left) - pathDepth(right));
	for (const path of removed) {
		if (removedDirectories.some((directory) => path.startsWith(directory))) {
			continue;
		}
		if (path.endsWith("/")) {
			updates.push({ type: "remove", path, recursive: true });
			removedDirectories.push(path);
		} else {
			updates.push({ type: "remove", path });
		}
	}

	const added = nextPaths
		.filter((path) => !previous.has(path))
		.sort((left, right) => pathDepth(left) - pathDepth(right));
	for (const path of added) updates.push({ type: "add", path });

	return updates;
}
