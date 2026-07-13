import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import {
	skipToken,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
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

	return useQuery(
		threadId && path && enabled
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

export function useProjectGitRefs(projectId: string | undefined) {
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

export function invalidateThreadGitQueries(
	queryClient: ReturnType<typeof useQueryClient>,
	threadId: string
) {
	invalidateGitQueries(queryClient, threadId);
}
