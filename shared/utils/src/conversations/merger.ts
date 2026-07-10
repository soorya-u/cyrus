import type { ConversationEntry } from "@cyrus/schemas/rtc/threads";

export function snapshotHasPersistedTerminal(
	snapshot: ConversationEntry[],
	turnId: string
): boolean {
	return snapshot.some(
		(entry) =>
			entry.chunk.turnId === turnId &&
			entry.seq > 0 &&
			(entry.chunk.event.type === "turn_completed" ||
				entry.chunk.event.type === "turn_interrupted")
	);
}

function snapshotHasUserMessageForTurn(
	snapshot: ConversationEntry[],
	turnId: string
): boolean {
	return snapshot.some(
		(entry) =>
			entry.chunk.turnId === turnId && entry.chunk.event.type === "user_message"
	);
}

export function mergeSnapshotAndOverlay(
	snapshot: ConversationEntry[],
	overlay: ConversationEntry[]
): ConversationEntry[] {
	const snapshotSeqs = new Set(snapshot.map((entry) => entry.seq));
	const merged = [...snapshot];

	for (const entry of overlay) {
		if (entry.seq === 0) {
			const { turnId, event } = entry.chunk;
			if (
				event.type === "user_message" &&
				snapshotHasUserMessageForTurn(snapshot, turnId)
			)
				continue;

			merged.push(entry);
			continue;
		}
		if (!snapshotSeqs.has(entry.seq)) merged.push(entry);
	}

	return merged.sort((left, right) => {
		if (left.seq !== right.seq) {
			if (left.seq === 0) return 1;
			if (right.seq === 0) return -1;
			return left.seq - right.seq;
		}
		return left.createdAt.localeCompare(right.createdAt);
	});
}
