import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import type { GetConversationsOutput } from "@cyrus/schemas/rtc/threads";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRtc } from "../contexts/rtc";
import { applyChunkToCache } from "./conversation-cache";

type ConversationsSnapshot = {
	threadId: string;
	previous: GetConversationsOutput | undefined;
};

export function useRespondApproval() {
	const queryClient = useQueryClient();
	const { orpc: orpcController } = useRtc();
	return useMutation({
		...orpcController.respondApproval.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.respondApproval,
		}),
		onMutate: (input): ConversationsSnapshot => {
			const queryKey = RTC_OPERATION_KEYS.getConversations(input.threadId);
			const previous =
				queryClient.getQueryData<GetConversationsOutput>(queryKey);
			applyChunkToCache(queryClient, {
				threadId: input.threadId,
				turnId: "local-interactive",
				seq: 0,
				event: {
					type: "approval_resolved",
					toolCallId: input.toolCallId,
					optionId: input.optionId,
				},
			});
			return { threadId: input.threadId, previous };
		},
		onError: (_error, _input, context) => {
			if (!context) return;
			queryClient.setQueryData(
				RTC_OPERATION_KEYS.getConversations(context.threadId),
				context.previous
			);
		},
	});
}

export function useRespondElicitation() {
	const queryClient = useQueryClient();
	const { orpc: orpcController } = useRtc();
	return useMutation({
		...orpcController.respondElicitation.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.respondElicitation,
		}),
		onMutate: (input): ConversationsSnapshot => {
			const queryKey = RTC_OPERATION_KEYS.getConversations(input.threadId);
			const previous =
				queryClient.getQueryData<GetConversationsOutput>(queryKey);
			applyChunkToCache(queryClient, {
				threadId: input.threadId,
				turnId: "local-interactive",
				seq: 0,
				event: {
					type: "elicitation_resolved",
					elicitationId: input.elicitationId,
					action: input.action,
				},
			});
			return { threadId: input.threadId, previous };
		},
		onError: (_error, _input, context) => {
			if (!context) return;
			queryClient.setQueryData(
				RTC_OPERATION_KEYS.getConversations(context.threadId),
				context.previous
			);
		},
	});
}
