import { createPatch } from "diff";
import parseDiff from "parse-diff";

type DiffContentLike = {
	type: "diff";
	path: string;
	oldText?: string | null;
	newText: string;
};

function isDiffContent(item: unknown): item is DiffContentLike {
	return (
		typeof item === "object" &&
		item !== null &&
		(item as { type?: unknown }).type === "diff"
	);
}

export function enrichDiffContent<T>(
	content: T[] | null | undefined
): T[] | undefined {
	if (!content) return;
	return content.map((item) => {
		if (!isDiffContent(item)) return item;
		const oldText = item.oldText ?? "";
		const patch = createPatch(item.path, oldText, item.newText);
		const { additions, deletions } = summarizePatch(patch);
		return { ...item, patch, additions, deletions } as T;
	});
}

function summarizePatch(patch: string): {
	additions: number;
	deletions: number;
} {
	const diff = { additions: 0, deletions: 0 };

	const parsed = parseDiff(patch);
	for (const file of parsed)
		for (const chunk of file.chunks)
			for (const change of chunk.changes)
				if (change.type === "add") diff.additions++;
				else if (change.type === "del") diff.deletions++;

	return diff;
}
