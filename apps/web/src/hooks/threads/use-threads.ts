import type { Project } from "@cyrus/hooks/types";
import { useMutation, useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { RTC_OPERATION_KEYS } from "@/constants/operation-keys";
import type { OrpcController } from "@/lib/orpc";
import { mapThread } from "@/utils/map-controller";

type UseThreadsOptions = {
	orpcController: OrpcController | undefined;
	projects: Project[];
	invalidateThreads: (projectId?: string) => void;
};

export function useThreads({
	orpcController,
	projects,
	invalidateThreads,
}: UseThreadsOptions) {
	const threadQueries = useQueries({
		queries: projects.map((project) => ({
			...orpcController?.listThreads.queryOptions({
				queryKey: RTC_OPERATION_KEYS.listThreads(project.id),
				input: { projectId: project.id },
			}),
			queryKey: RTC_OPERATION_KEYS.listThreads(project.id),
			enabled: Boolean(orpcController),
		})),
	});

	const baseThreads = useMemo(
		() =>
			threadQueries.flatMap(
				(query) => query.data?.threads.map(mapThread) ?? []
			),
		[threadQueries]
	);

	const createThreadMutation = useMutation({
		...orpcController?.createThread.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.createThread,
		}),
		onSuccess: (data) => invalidateThreads(data.thread.projectId),
	});

	const renameThreadMutation = useMutation({
		...orpcController?.renameThread.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.renameThread,
		}),
		onSuccess: () => invalidateThreads(),
	});

	const deleteThreadMutation = useMutation({
		...orpcController?.deleteThread.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.deleteThread,
		}),
		onSuccess: () => invalidateThreads(),
	});

	async function createThread(projectId: string): Promise<string> {
		if (!orpcController) {
			throw new Error("worker not connected");
		}
		const { thread } = await createThreadMutation.mutateAsync({ projectId });
		return thread.id;
	}

	function renameThread(id: string, title: string) {
		renameThreadMutation.mutate({ threadId: id, name: title });
	}

	function deleteThread(id: string) {
		deleteThreadMutation.mutate({ threadId: id });
	}

	return {
		baseThreads,
		createThread,
		renameThread,
		deleteThread,
	};
}

export type UseThreads = ReturnType<typeof useThreads>;
export type { Thread } from "@cyrus/hooks/types";
