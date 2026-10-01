import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import {
	skipToken,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { Result } from "better-result";
import { useEffect } from "react";
import { useRtc } from "../contexts/rtc";

export function useGitStatus(threadId: string | undefined) {
	const { orpc: orpcController } = useRtc();

	return useQuery(
		threadId
			? orpcController.getGitStatus.queryOptions({
					queryKey: RTC_OPERATION_KEYS.getGitStatus(threadId),
					input: { threadId },
				})
			: {
					queryKey: RTC_OPERATION_KEYS.getGitStatus("none"),
					queryFn: skipToken,
				}
	);
}

export function useGitPatch(
	threadId: string | undefined,
	path: string | undefined,
	enabled = true
) {
	const { orpc: orpcController } = useRtc();

	// No path means the whole working-tree patch.
	return useQuery(
		threadId && enabled
			? orpcController.getGitPatch.queryOptions({
					queryKey: RTC_OPERATION_KEYS.getGitPatch(threadId, path),
					input: { threadId, path },
				})
			: {
					queryKey: RTC_OPERATION_KEYS.getGitPatch(threadId ?? "none", path),
					queryFn: skipToken,
				}
	);
}

const WATCH_RETRY_MIN_MS = 1000;
const WATCH_RETRY_MAX_MS = 30_000;

/** Keeps git queries fresh while a File watch for the thread's effective cwd is open. */
export function useGitFilesWatch(threadId: string | undefined) {
	const { connection } = useRtc();
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!threadId) return;
		const abort = new AbortController();
		let iterator:
			| Awaited<ReturnType<typeof connection.client.watchGitFiles>>
			| undefined;

		const sleep = (ms: number) =>
			new Promise<void>((resolve) => {
				const timer = setTimeout(resolve, ms);
				abort.signal.addEventListener(
					"abort",
					() => {
						clearTimeout(timer);
						resolve();
					},
					{ once: true }
				);
			});

		const run = async () => {
			let delay = WATCH_RETRY_MIN_MS;
			let reconnecting = false;
			while (!abort.signal.aborted) {
				let gotSignal = false;
				await Result.tryPromise(async () => {
					iterator = await connection.client.watchGitFiles(
						{ threadId },
						{ signal: abort.signal }
					);
					// Changes made while disconnected were never signalled.
					if (reconnecting) invalidateGitQueries(queryClient, threadId);
					for await (const _ of iterator) {
						if (abort.signal.aborted) break;
						gotSignal = true;
						invalidateGitQueries(queryClient, threadId);
					}
				});
				iterator = undefined;
				if (abort.signal.aborted) return;
				reconnecting = true;
				await sleep(delay);
				// Back off while connections keep ending without delivering anything.
				delay = gotSignal
					? WATCH_RETRY_MIN_MS
					: Math.min(delay * 2, WATCH_RETRY_MAX_MS);
			}
		};
		run().catch(() => undefined);

		return () => {
			abort.abort();
			iterator?.return?.(undefined)?.catch(() => undefined);
		};
	}, [connection, queryClient, threadId]);
}

export function useGitFile(
	threadId: string | undefined,
	path: string | undefined
) {
	const { orpc: orpcController } = useRtc();

	return useQuery(
		threadId && path
			? orpcController.readGitFile.queryOptions({
					queryKey: RTC_OPERATION_KEYS.readGitFile(threadId, path),
					input: { threadId, path },
					retry: false,
				})
			: {
					queryKey: RTC_OPERATION_KEYS.readGitFile(
						threadId ?? "none",
						path ?? ""
					),
					queryFn: skipToken,
				}
	);
}

export function useListGitRefs(threadId: string | undefined) {
	const { orpc: orpcController } = useRtc();

	return useQuery(
		threadId
			? orpcController.listGitRefs.queryOptions({
					queryKey: RTC_OPERATION_KEYS.listGitRefs(threadId),
					input: { threadId },
				})
			: {
					queryKey: RTC_OPERATION_KEYS.listGitRefs("none"),
					queryFn: skipToken,
				}
	);
}

function invalidateGitQueries(
	queryClient: ReturnType<typeof useQueryClient>,
	threadId: string
) {
	queryClient.invalidateQueries({
		queryKey: RTC_OPERATION_KEYS.getGitStatus(threadId),
	});
	queryClient.invalidateQueries({
		queryKey: ["controller", "get-git-patch", threadId],
	});
	queryClient.invalidateQueries({
		queryKey: ["controller", "read-git-file", threadId],
	});
	queryClient.invalidateQueries({
		queryKey: RTC_OPERATION_KEYS.listGitRefs(threadId),
	});
}

export function useCheckoutRef() {
	const queryClient = useQueryClient();
	const { orpc: orpcController } = useRtc();

	return useMutation({
		...orpcController.checkoutGitRef.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.checkoutGitRef,
		}),
		onSuccess: (_data, variables) => {
			invalidateGitQueries(queryClient, variables.threadId);
		},
	});
}

export function useInitGitRepository() {
	const queryClient = useQueryClient();
	const { orpc: orpcController } = useRtc();

	return useMutation({
		...orpcController.initGitRepository.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.initGitRepository,
		}),
		onSuccess: (_data, variables) => {
			invalidateGitQueries(queryClient, variables.threadId);
		},
	});
}

export function useCreateWorktree() {
	const queryClient = useQueryClient();
	const { orpc: orpcController } = useRtc();

	return useMutation({
		...orpcController.createGitWorktree.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.createGitWorktree,
		}),
		onSuccess: (_data, variables) => {
			invalidateGitQueries(queryClient, variables.threadId);
			queryClient.invalidateQueries({
				queryKey: ["controller", "list-threads"],
			});
		},
	});
}

export function useProjectGitStatus(projectId: string | undefined) {
	const { orpc: orpcController } = useRtc();

	return useQuery(
		projectId
			? orpcController.getProjectGitStatus.queryOptions({
					queryKey: RTC_OPERATION_KEYS.getProjectGitStatus(projectId),
					input: { projectId },
				})
			: {
					queryKey: RTC_OPERATION_KEYS.getProjectGitStatus("none"),
					queryFn: skipToken,
				}
	);
}

export function useListProjectGitRefs(projectId: string | undefined) {
	const { orpc: orpcController } = useRtc();

	return useQuery(
		projectId
			? orpcController.listProjectGitRefs.queryOptions({
					queryKey: RTC_OPERATION_KEYS.listProjectGitRefs(projectId),
					input: { projectId },
				})
			: {
					queryKey: RTC_OPERATION_KEYS.listProjectGitRefs("none"),
					queryFn: skipToken,
				}
	);
}
