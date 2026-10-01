import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { useRtc } from "@cyrus/hooks/contexts/rtc";
import type { GitDirectoryEntry } from "@cyrus/schemas/rtc/git";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Loads only requested directories; collapsing a folder keeps its children cached. */
export function useDirectoryEntries(threadId: string) {
	const { orpc } = useRtc();
	const queryClient = useQueryClient();
	const [directories, setDirectories] = useState(
		new Map<string, readonly GitDirectoryEntry[]>()
	);
	const requested = useRef(new Set<string>());
	const inFlight = useRef(new Map<string, Promise<void>>());
	const active = useRef(true);
	const [errors, setErrors] = useState(new Map<string, string>());

	const load = useCallback(
		(directoryPath: string, refresh = false): Promise<void> => {
			const existing = inFlight.current.get(directoryPath);
			if (existing) return existing;
			if (!refresh && requested.current.has(directoryPath)) {
				return Promise.resolve();
			}
			requested.current.add(directoryPath);

			const request = queryClient
				.fetchQuery({
					...orpc.listGitDirectory.queryOptions({
						queryKey: RTC_OPERATION_KEYS.listGitDirectory(
							threadId,
							directoryPath
						),
						input: { threadId, directoryPath },
					}),
					staleTime: 0,
				})
				.then((result) => {
					if (!active.current) return;
					setDirectories((previous) =>
						new Map(previous).set(directoryPath, result.entries)
					);
					setErrors((previous) => {
						const next = new Map(previous);
						next.delete(directoryPath);
						return next;
					});
				})
				.catch((error: unknown) => {
					requested.current.delete(directoryPath);
					if (!active.current) return;
					setErrors((previous) =>
						new Map(previous).set(
							directoryPath,
							error instanceof Error ? error.message : "Unable to load folder."
						)
					);
				})
				.finally(() => {
					inFlight.current.delete(directoryPath);
				});
			inFlight.current.set(directoryPath, request);
			return request;
		},
		[orpc, queryClient, threadId]
	);

	useEffect(() => {
		active.current = true;
		load("");
		return () => {
			active.current = false;
		};
	}, [load]);

	const entries = useMemo(() => {
		const result: GitDirectoryEntry[] = [];
		const visit = (path: string) => {
			for (const entry of directories.get(path) ?? []) {
				result.push(entry);
				if (entry.kind === "directory") visit(entry.path);
			}
		};
		visit("");
		return result;
	}, [directories]);

	const refresh = useCallback(() => {
		for (const path of [...requested.current]) load(path, true);
	}, [load]);

	return {
		entries,
		load,
		refresh,
		ready: directories.has(""),
		error: errors.get("") ?? null,
	};
}
