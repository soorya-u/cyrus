import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { skipToken, useQuery } from "@tanstack/react-query";
import { useRtc } from "../contexts/rtc";

export function useListDir(cwd: string, depth = 1, enabled = true) {
	const { orpc: orpcController } = useRtc();

	return useQuery(
		enabled && cwd.length > 0
			? orpcController.listDir.queryOptions({
					queryKey: RTC_OPERATION_KEYS.listDir(cwd, depth),
					input: { cwd, depth },
				})
			: {
					queryKey: RTC_OPERATION_KEYS.listDir(cwd, depth),
					queryFn: skipToken,
				}
	);
}
