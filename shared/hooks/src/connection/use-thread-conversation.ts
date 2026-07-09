import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import type { ConversationEntry } from "@cyrus/schemas/rtc/threads";
import type { ThreadConversation } from "@cyrus/schemas/view";
import { fold } from "@cyrus/utils/fold";
import { mergeSnapshotAndOverlay } from "@cyrus/utils/merge-conversation";
import { useQuery } from "@tanstack/react-query";
import { Result } from "better-result";
import { log } from "evlog";
import { useEffect, useEffectEvent, useMemo } from "react";
import { useRtc } from "../contexts/rtc";
import { useConversationOverlay } from "../stores/conversation-overlay";

const EMPTY: ThreadConversation = {
	diffs: [],
	messages: [],
	toolCalls: [],
	turns: [],
};

export function useThreadConversation(
	threadId: string | undefined
): ThreadConversation {
	const { orpc: orpcController, connection: workerConnection } = useRtc();
	const applySnapshot = useConversationOverlay((state) => state.applySnapshot);
	const applyWatermark = useConversationOverlay(
		(state) => state.applyWatermark
	);
	const clearTurn = useConversationOverlay((state) => state.clearTurn);
	const liveEntries = useConversationOverlay((state) =>
		threadId ? state.getLiveEntries(threadId) : []
	);

	const conversationsQuery = useQuery({
		...orpcController.getConversations.queryOptions({
			queryKey: RTC_OPERATION_KEYS.getConversations(threadId ?? "none"),
			input: { threadId: threadId ?? "" },
		}),
		enabled: Boolean(threadId),
	});

	const onWatchResult = useEffectEvent(
		(tid: string, snapshotHighWaterMark: number) =>
			applyWatermark(tid, snapshotHighWaterMark)
	);

	const onWatchError = useEffectEvent((error: unknown, tid: string) => {
		log.error({ kind: "watch_thread", error, threadId: tid });
	});

	const onUnwatchError = useEffectEvent((error: unknown, tid: string) => {
		log.error({ kind: "unwatch_thread", error, threadId: tid });
	});

	const syncSnapshot = useEffectEvent(
		(tid: string, conversations: ConversationEntry[]) => {
			applySnapshot(tid, conversations);

			for (const entry of conversations) {
				if (
					entry.chunk.event.type === "turn_completed" ||
					entry.chunk.event.type === "turn_interrupted"
				) {
					clearTurn(tid, entry.chunk.turnId);
				}
			}
		}
	);

	useEffect(() => {
		if (!threadId) return;

		const abort = new AbortController();

		Result.tryPromise(() =>
			workerConnection.client.watchThread({ threadId })
		).then((result) => {
			if (abort.signal.aborted) return;
			result.match({
				ok: ({ snapshotHighWaterMark }) =>
					onWatchResult(threadId, snapshotHighWaterMark),
				err: (error) => onWatchError(error, threadId),
			});
		});

		return () => {
			abort.abort();
			workerConnection.client
				.unwatchThread({ threadId })
				.catch((error) => onUnwatchError(error, threadId));
		};
	}, [threadId, workerConnection]);

	useEffect(() => {
		if (!(threadId && conversationsQuery.data?.conversations)) return;
		syncSnapshot(threadId, conversationsQuery.data.conversations);
	}, [threadId, conversationsQuery.data]);

	return useMemo(() => {
		const merged = mergeSnapshotAndOverlay(
			conversationsQuery.data?.conversations ?? [],
			liveEntries
		);

		return fold(merged).match({
			ok: (conversation) => conversation,
			err: (error) => {
				log.error({ kind: "fold_conversation", error, threadId });
				return EMPTY;
			},
		});
	}, [conversationsQuery.data?.conversations, liveEntries, threadId]);
}
