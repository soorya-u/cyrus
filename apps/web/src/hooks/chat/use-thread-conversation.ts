import { deriveThreadFromConversation } from "@cyrus/hooks/derive-thread";
import type { Thread } from "@cyrus/hooks/types";
import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useMemo } from "react";
import { RTC_OPERATION_KEYS } from "@/constants/operation-keys";
import type { OrpcController } from "@/lib/orpc";

type ConversationExtras = Pick<
	Thread,
	"messages" | "toolCalls" | "diffs" | "turns" | "status"
>;

const EMPTY: ConversationExtras = {
	diffs: [],
	messages: [],
	status: "idle",
	toolCalls: [],
	turns: [],
};

/**
 * Reads the real conversation history for one thread (via getConversations)
 * and folds it into the aggregated shape ChatFeed/DiffPanel/WorkLog render.
 * Live updates (this device's own sendMessage, or another device's) land in
 * the same TanStack Query cache entry — see use-controller-threads.ts —
 * so every mounted instance for a given threadId reflects the same state.
 */
export function useThreadConversation(
	threadId: string | undefined
): ConversationExtras {
	const { orpcController } = useRouteContext({ strict: false }) as {
		orpcController?: OrpcController;
	};

	const queryKey = threadId
		? RTC_OPERATION_KEYS.getConversations(threadId)
		: (["controller", "get-conversations", "none"] as const);

	const conversationsQuery = useQuery({
		...orpcController?.getConversations.queryOptions({
			queryKey,
			input: { threadId: threadId ?? "" },
		}),
		queryKey,
		enabled: Boolean(orpcController && threadId),
	});

	return useMemo(() => {
		if (!conversationsQuery.data) return EMPTY;
		const derived = deriveThreadFromConversation(
			conversationsQuery.data.conversations
		);
		const latestTurn = derived.turns.at(-1);
		return {
			...derived,
			status: latestTurn?.state === "running" ? "running" : "ready",
		};
	}, [conversationsQuery.data]);
}
