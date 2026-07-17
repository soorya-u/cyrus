import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRtc } from "../contexts/rtc";

export function useStartThread(projectId: string) {
	const queryClient = useQueryClient();
	const { orpc: orpcController } = useRtc();

	return useMutation({
		...orpcController.startThread.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.startThread,
		}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: RTC_OPERATION_KEYS.listThreads(projectId),
			});
		},
	});
}
