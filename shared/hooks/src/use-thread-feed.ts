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

export function turnDiffSummary(thread: Thread | null) {
	if (!thread) {
		return [];
	}
	return thread.turns.map((turn) => {
		const diffs = thread.diffs.filter((d) => d.turnId === turn.id);
		const additions = diffs.reduce((n, d) => n + d.additions, 0);
		const deletions = diffs.reduce((n, d) => n + d.deletions, 0);
		return {
			turnId: turn.id,
			index: turn.index,
			additions,
			deletions,
			fileCount: diffs.length,
		};
	});
}
