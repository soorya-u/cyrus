import { useMemo } from "react";
import type { FeedEntry, GitDiff, Thread, ToolCall } from "./types";

export function deriveFeed(thread: Thread | null): FeedEntry[] {
	if (!thread) {
		return [];
	}
	const entries: FeedEntry[] = [];
	const activitiesByTurn = new Map<
		string,
		{ tools: ToolCall[]; diffs: GitDiff[] }
	>();
	for (const tc of thread.toolCalls) {
		const group = activitiesByTurn.get(tc.turnId) ?? { tools: [], diffs: [] };
		group.tools.push(tc);
		activitiesByTurn.set(tc.turnId, group);
	}
	for (const d of thread.diffs) {
		const group = activitiesByTurn.get(d.turnId) ?? { tools: [], diffs: [] };
		group.diffs.push(d);
		activitiesByTurn.set(d.turnId, group);
	}

	const seenTurns = new Set<string>();
	for (const msg of thread.messages) {
		if (!msg.turnId) {
			entries.push({ type: "message", id: msg.id, message: msg });
			continue;
		}
		const group = activitiesByTurn.get(msg.turnId);
		if (
			!seenTurns.has(msg.turnId) &&
			group &&
			(group.tools.length > 0 || group.diffs.length > 0)
		) {
			entries.push({
				type: "work",
				id: `work-${msg.turnId}`,
				turnId: msg.turnId,
				activities: group.tools,
				diffs: group.diffs,
			});
			seenTurns.add(msg.turnId);
		}
		entries.push({ type: "message", id: msg.id, message: msg });
	}
	return entries;
}

export function useThreadFeed(thread: Thread | null): FeedEntry[] {
	return useMemo(() => deriveFeed(thread), [thread]);
}
