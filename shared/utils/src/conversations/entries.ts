import type { ConversationEntry } from "@cyrus/schemas/rtc/threads";

function isPersisted(entry: ConversationEntry): boolean {
	return entry.sub === undefined;
}

function dropRedundantEphemeralUserMessages(
	entries: ConversationEntry[]
): ConversationEntry[] {
	const persistedUserTurns = new Set(
		entries
			.filter(
				(entry) =>
					isPersisted(entry) && entry.chunk.event.type === "user_message"
			)
			.map((entry) => entry.chunk.turnId)
	);

	if (persistedUserTurns.size === 0) return entries;

	return entries.filter(
		(entry) =>
			!(
				!isPersisted(entry) &&
				entry.chunk.event.type === "user_message" &&
				persistedUserTurns.has(entry.chunk.turnId)
			)
	);
}

export function sortConversationEntries(
	entries: ConversationEntry[]
): ConversationEntry[] {
	return [...entries].sort((left, right) => {
		if (left.seq !== right.seq) return left.seq - right.seq;
		const leftSub = left.sub ?? 0;
		const rightSub = right.sub ?? 0;
		if (leftSub !== rightSub) return leftSub - rightSub;
		return left.createdAt.localeCompare(right.createdAt);
	});
}

export function currentMaxPersistedSeq(entries: ConversationEntry[]): number {
	return entries.reduce(
		(max, entry) => (isPersisted(entry) && entry.seq > max ? entry.seq : max),
		0
	);
}

export function mergeConversationEntries(
	cached: ConversationEntry[],
	fetched: ConversationEntry[]
): ConversationEntry[] {
	if (cached.length === 0)
		return sortConversationEntries(dropRedundantEphemeralUserMessages(fetched));
	if (fetched.length === 0)
		return sortConversationEntries(dropRedundantEphemeralUserMessages(cached));

	const merged = new Map<string, ConversationEntry>();

	for (const entry of fetched) {
		if (isPersisted(entry)) merged.set(`seq-${entry.seq}`, entry);
	}

	for (const entry of cached) {
		if (isPersisted(entry)) {
			if (!merged.has(`seq-${entry.seq}`))
				merged.set(`seq-${entry.seq}`, entry);
			continue;
		}
		merged.set(entry.id, entry);
	}

	return sortConversationEntries(
		dropRedundantEphemeralUserMessages([...merged.values()])
	);
}
