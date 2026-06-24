import { useMemo } from "react";
export function deriveFeed(thread) {
	if (!thread) {
		return [];
	}
	const entries = [];
	const activitiesByTurn = new Map();
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
	const seenTurns = new Set();
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
export function useThreadFeed(thread) {
	return useMemo(() => deriveFeed(thread), [thread]);
}
export function turnDiffSummary(thread) {
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
