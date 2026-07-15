import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { applyChunkToCache } from "@cyrus/utils/conversations/cache";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRtc } from "../contexts/rtc";

export function useRespondApproval() {
	const queryClient = useQueryClient();
	const { orpc: orpcController } = useRtc();
	return useMutation({
		...orpcController.respondApproval.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.respondApproval,
		}),
		onMutate: (input) => {
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
		onMutate: (input) => {
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
		},
	});
}
