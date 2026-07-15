import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import type { ThreadConversation } from "@cyrus/schemas/view";
import { mergeConversationEntries } from "@cyrus/utils/conversations/cache";
import { fold } from "@cyrus/utils/fold";
import {
	keepPreviousData,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { Result } from "better-result";
import { log } from "evlog";
import { useEffect, useEffectEvent, useMemo } from "react";
import { useRtc } from "../contexts/rtc";

const EMPTY: ThreadConversation = {
	diffs: [],
	errors: [],
	messages: [],
	thoughts: [],
	toolCalls: [],
	turns: [],
};

export function useThreadConversation(
	threadId: string | undefined
): ThreadConversation {
	const queryClient = useQueryClient();
	const { orpc: orpcController, connection: workerConnection } = useRtc();

	const queryKey = RTC_OPERATION_KEYS.getConversations(threadId ?? "none");
	const baseQueryOptions = orpcController.getConversations.queryOptions({
		queryKey,
		input: { threadId: threadId ?? "" },
	});

	const conversationsQuery = useQuery({
		...baseQueryOptions,
		enabled: Boolean(threadId),
		placeholderData: keepPreviousData,
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		queryFn: async (context) => {
			const fetched = await baseQueryOptions.queryFn(context);
			const cached = queryClient.getQueryData<typeof fetched>(queryKey);
			return {
				conversations: mergeConversationEntries(
					cached?.conversations ?? [],
					fetched.conversations
				),
			};
		},
	});

	const onWatchError = useEffectEvent((error: unknown, tid: string) => {
		log.error({ kind: "watch_thread", error, threadId: tid });
	});

	const onUnwatchError = useEffectEvent((error: unknown, tid: string) => {
		log.error({ kind: "unwatch_thread", error, threadId: tid });
	});

	useEffect(() => {
		if (!threadId) return;

		const abort = new AbortController();

		Result.tryPromise(() =>
			workerConnection.client.watchThread({ threadId })
		).then((result) => {
			if (abort.signal.aborted) return;
			result.match({
				ok: () => undefined,
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

	return useMemo(
		() =>
			fold(conversationsQuery.data?.conversations ?? []).match({
				ok: (conversation) => conversation,
				err: (error) => {
					log.error({ kind: "fold_conversation", error, threadId });
					return EMPTY;
				},
			}),
		[conversationsQuery.data?.conversations, threadId]
	);
}
