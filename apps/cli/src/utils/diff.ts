import { createPatch } from "diff";

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
		let additions = 0;
		let deletions = 0;
		for (const line of patch.split("\n")) {
			if (line.startsWith("+++") || line.startsWith("---")) continue;
			if (line.startsWith("+")) additions++;
			else if (line.startsWith("-")) deletions++;
		}
		return { ...item, patch, additions, deletions } as T;
	});
}
