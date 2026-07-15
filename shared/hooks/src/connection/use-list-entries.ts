import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { skipToken, useQuery } from "@tanstack/react-query";
import { useRtc } from "../contexts/rtc";

export function useListEntries(
	cwd: string,
	depth = 1,
	enabled = true,
	includeFiles = false
) {
	const { orpc: orpcController } = useRtc();

	return useQuery(
		enabled && cwd.length > 0
			? orpcController.listEntries.queryOptions({
					queryKey: [
						...RTC_OPERATION_KEYS.listEntries(cwd, depth),
						includeFiles ? "files" : "dirs",
					],
					input: { cwd, depth, includeFiles },
				})
			: {
					queryKey: [
						...RTC_OPERATION_KEYS.listEntries(cwd, depth),
						includeFiles ? "files" : "dirs",
					],
					queryFn: skipToken,
				}
	);
}
