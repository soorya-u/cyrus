import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { useQuery } from "@tanstack/react-query";
import { useRtc } from "../contexts/rtc";

export function useListAgents() {
	const { orpc: orpcController } = useRtc();

	return useQuery({
		...orpcController.listAgents.queryOptions({
			queryKey: RTC_OPERATION_KEYS.listAgents,
		}),
	});
}

export type UseListAgents = ReturnType<typeof useListAgents>;
