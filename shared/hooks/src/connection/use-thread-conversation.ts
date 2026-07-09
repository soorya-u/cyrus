import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import type { ThreadConversation } from "@cyrus/schemas/view";
import { fold } from "@cyrus/utils/fold";
import { useQuery } from "@tanstack/react-query";
import { log } from "evlog";
import { useRtc } from "../contexts/rtc";

const EMPTY: ThreadConversation = {
	diffs: [],
	messages: [],
	toolCalls: [],
	turns: [],
};

export function useThreadConversation(
	threadId: string | undefined
): ThreadConversation {
	const { orpc: orpcController } = useRtc();

	const queryKey = threadId
		? RTC_OPERATION_KEYS.getConversations(threadId)
		: (["controller", "get-conversations", "none"] as const);

	const conversationsQuery = useQuery({
		...orpcController.getConversations.queryOptions({
			queryKey,
			input: { threadId: threadId ?? "" },
		}),
		queryKey,
		enabled: Boolean(threadId),
		select: (data) =>
			fold(data.conversations).match({
				ok: (conversation) => conversation,
				err: (error) => {
					log.error({ kind: "fold_conversation", error, threadId });
					return EMPTY;
				},
			}),
	});

	return conversationsQuery.data ?? EMPTY;
}
