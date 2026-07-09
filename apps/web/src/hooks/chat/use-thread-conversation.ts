import type { ThreadConversation } from "@cyrus/schemas/view";
import { fold } from "@cyrus/utils/fold";
import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useMemo } from "react";
import { RTC_OPERATION_KEYS } from "@/constants/operation-keys";
import type { OrpcController } from "@/lib/orpc";

const EMPTY: ThreadConversation = {
	diffs: [],
	messages: [],
	toolCalls: [],
	turns: [],
};

export function useThreadConversation(
	threadId: string | undefined
): ThreadConversation {
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
		return fold(conversationsQuery.data.conversations).match({
			ok: (conversation) => conversation,
			err: () => EMPTY,
		});
	}, [conversationsQuery.data]);
}
