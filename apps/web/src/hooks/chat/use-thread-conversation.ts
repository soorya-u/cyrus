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
