import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import type { Project } from "@cyrus/schemas/rtc/projects";
import { useMutation, useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { useRtc } from "../contexts/rtc";

type UseThreadsOptions = {
	projects: Project[];
	invalidateThreads: (projectId?: string) => void;
};

export function useThreads({ projects, invalidateThreads }: UseThreadsOptions) {
	const { orpc: orpcController } = useRtc();

	const threadQueries = useQueries({
		queries: projects.map((project) => ({
			...orpcController.listThreads.queryOptions({
				queryKey: RTC_OPERATION_KEYS.listThreads(project.id),
				input: { projectId: project.id },
			}),
			queryKey: RTC_OPERATION_KEYS.listThreads(project.id),
		})),
	});

	const baseThreads = useMemo(
		() => threadQueries.flatMap((query) => query.data?.threads ?? []),
		[threadQueries]
	);

	const createThreadMutation = useMutation({
		...orpcController.createThread.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.createThread,
		}),
		onSuccess: (data) => invalidateThreads(data.thread.projectId),
	});

	const renameThreadMutation = useMutation({
		...orpcController.renameThread.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.renameThread,
		}),
		onSuccess: () => invalidateThreads(),
	});

	const deleteThreadMutation = useMutation({
		...orpcController.deleteThread.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.deleteThread,
		}),
		onSuccess: () => invalidateThreads(),
	});

	function createThread(
		projectId: string,
		options?: {
			branch?: string;
			worktreePath?: string;
			onSuccess?: (threadId: string) => void;
			onError?: (error: Error) => void;
		}
	) {
		const { onSuccess, onError, branch, worktreePath } = options ?? {};
		createThreadMutation.mutate(
			{ projectId, branch, worktreePath },
			{
				onSuccess: (data) => onSuccess?.(data.thread.id),
				onError,
			}
		);
	}

	function renameThread(id: string, name: string) {
		renameThreadMutation.mutate({ threadId: id, name });
	}

	function deleteThread(id: string) {
		deleteThreadMutation.mutate({ threadId: id });
	}

	return {
		baseThreads,
		createThread,
		isCreatingThread: createThreadMutation.isPending,
		renameThread,
		deleteThread,
	};
}

export type { Thread } from "@cyrus/schemas/rtc/threads";
