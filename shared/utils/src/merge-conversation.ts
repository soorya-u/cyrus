import type { ConversationEntry } from "@cyrus/schemas/rtc/threads";

export function mergeSnapshotAndOverlay(
	snapshot: ConversationEntry[],
	overlay: ConversationEntry[]
): ConversationEntry[] {
	const snapshotSeqs = new Set(snapshot.map((entry) => entry.seq));
	const merged = [...snapshot];

	for (const entry of overlay)
		if (entry.seq === 0 || !snapshotSeqs.has(entry.seq)) merged.push(entry);

	return merged.sort((left, right) => {
		if (left.seq !== right.seq) {
			if (left.seq === 0) return 1;
			if (right.seq === 0) return -1;
			return left.seq - right.seq;
		}
		return left.createdAt.localeCompare(right.createdAt);
	});
}
