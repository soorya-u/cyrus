import type { ConversationEntry } from "@cyrus/schemas/rtc/threads";

function dropRedundantEphemeralUserMessages(
	entries: ConversationEntry[]
): ConversationEntry[] {
	const persistedUserTurns = new Set(
		entries
			.filter(
				(entry) => entry.seq > 0 && entry.chunk.event.type === "user_message"
			)
			.map((entry) => entry.chunk.turnId)
	);

	if (persistedUserTurns.size === 0) return entries;

	return entries.filter(
		(entry) =>
			!(
				entry.seq === 0 &&
				entry.chunk.event.type === "user_message" &&
				persistedUserTurns.has(entry.chunk.turnId)
			)
	);
}

export function sortConversationEntries(
	entries: ConversationEntry[]
): ConversationEntry[] {
	return [...entries].sort((left, right) => {
		if (left.seq !== right.seq) {
			if (left.seq === 0) return 1;
			if (right.seq === 0) return -1;
			return left.seq - right.seq;
		}
		return left.createdAt.localeCompare(right.createdAt);
	});
}

/** Sort and drop ephemeral user messages superseded by persisted ones. */
export function normalizeConversationEntries(
	entries: ConversationEntry[]
): ConversationEntry[] {
	return dropRedundantEphemeralUserMessages(sortConversationEntries(entries));
}

export function mergeConversationEntries(
	cached: ConversationEntry[],
	fetched: ConversationEntry[]
): ConversationEntry[] {
	if (cached.length === 0) return normalizeConversationEntries(fetched);
	if (fetched.length === 0) return normalizeConversationEntries(cached);

	const merged = new Map<string, ConversationEntry>();

	for (const entry of fetched) {
		if (entry.seq > 0) merged.set(`seq-${entry.seq}`, entry);
	}

	for (const entry of cached) {
		if (entry.seq > 0) {
			if (!merged.has(`seq-${entry.seq}`))
				merged.set(`seq-${entry.seq}`, entry);
			continue;
		}
		merged.set(entry.id, entry);
	}

	return normalizeConversationEntries([...merged.values()]);
}
