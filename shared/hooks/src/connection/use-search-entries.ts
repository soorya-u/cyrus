import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { skipToken, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRtc } from "../contexts/rtc";

const SEARCH_ENTRIES_DEBOUNCE_MS = 120;
const SEARCH_ENTRIES_LIMIT = 80;

export function useSearchEntries(
	cwd: string,
	query: string,
	enabled = true,
	limit = SEARCH_ENTRIES_LIMIT
) {
	const { orpc: orpcController } = useRtc();
	const [debouncedQuery, setDebouncedQuery] = useState(query);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(query);
		}, SEARCH_ENTRIES_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [query]);

	const normalized = debouncedQuery.trim();
	const canSearch = enabled && cwd.length > 0 && normalized.length > 0;
	const pendingDebounce = query.trim() !== normalized;

	const result = useQuery(
		canSearch
			? orpcController.searchEntries.queryOptions({
					queryKey: RTC_OPERATION_KEYS.searchEntries(cwd, normalized, limit),
					input: { cwd, query: normalized, limit },
					staleTime: 0,
					gcTime: 30_000,
				})
			: {
					queryKey: RTC_OPERATION_KEYS.searchEntries(cwd, normalized, limit),
					queryFn: skipToken,
				}
	);

	return {
		...result,
		isPending: pendingDebounce || result.isPending,
		isFetching: pendingDebounce || result.isFetching,
	};
}
