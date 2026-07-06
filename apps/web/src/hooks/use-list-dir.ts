import { skipToken, useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { RTC_OPERATION_KEYS } from "@/constants/operation-keys";

export function useListDir(cwd: string, depth = 1, enabled = true) {
	const { orpcController } = useRouteContext({ strict: false });

	return useQuery(
		orpcController
			? orpcController.listDir.queryOptions({
					queryKey: RTC_OPERATION_KEYS.listDir(cwd, depth),
					input: { cwd, depth },
					enabled: enabled && cwd.length > 0,
				})
			: {
					queryKey: RTC_OPERATION_KEYS.listDir(cwd, depth),
					queryFn: skipToken,
					enabled: false,
				}
	);
}
