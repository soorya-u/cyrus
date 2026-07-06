import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { RTC_OPERATION_KEYS } from "@/constants/operation-keys";
import type { OrpcController } from "@/lib/orpc";
import { mapProject } from "@/utils/map-controller";

export function useProjects() {
	const queryClient = useQueryClient();
	const { orpcController } = useRouteContext({ strict: false });

	const listProjectsQuery = useQuery({
		...orpcController?.listProjects.queryOptions({
			queryKey: RTC_OPERATION_KEYS.listProjects,
		}),
		queryKey: RTC_OPERATION_KEYS.listProjects,
		enabled: Boolean(orpcController),
	});

	const projects = useMemo(
		() => (listProjectsQuery.data?.projects ?? []).map(mapProject),
		[listProjectsQuery.data?.projects]
	);

	const invalidateProjects = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: RTC_OPERATION_KEYS.listProjects,
		});
	}, [queryClient]);

	const invalidateThreads = useCallback(
		(projectId?: string) => {
			if (projectId) {
				queryClient.invalidateQueries({
					queryKey: RTC_OPERATION_KEYS.listThreads(projectId),
				});
				return;
			}
			for (const project of projects) {
				queryClient.invalidateQueries({
					queryKey: RTC_OPERATION_KEYS.listThreads(project.id),
				});
			}
		},
		[projects, queryClient]
	);

	const createProjectMutation = useMutation({
		...orpcController?.createProject.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.createProject,
		}),
		onSuccess: invalidateProjects,
	});

	const renameProjectMutation = useMutation({
		...orpcController?.renameProject.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.renameProject,
		}),
		onSuccess: invalidateProjects,
	});

	const deleteProjectMutation = useMutation({
		...orpcController?.deleteProject.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.deleteProject,
		}),
		onSuccess: () => {
			invalidateProjects();
			invalidateThreads();
		},
	});

	const createProject = useCallback(
		async (name: string, path: string): Promise<string> => {
			if (!orpcController) {
				throw new Error("worker not connected");
			}
			const { project } = await createProjectMutation.mutateAsync({
				name,
				cwd: path,
			});
			return project.id;
		},
		[createProjectMutation, orpcController]
	);

	const renameProject = useCallback(
		(id: string, name: string) => {
			renameProjectMutation.mutate({ projectId: id, name });
		},
		[renameProjectMutation]
	);

	const removeProject = useCallback(
		(id: string) => {
			deleteProjectMutation.mutate({ projectId: id });
		},
		[deleteProjectMutation]
	);

	return {
		orpcController: orpcController as OrpcController | undefined,
		projects,
		isLoading: listProjectsQuery.isLoading,
		invalidateThreads,
		createProject,
		renameProject,
		removeProject,
	};
}

export type UseProjects = ReturnType<typeof useProjects>;
export type { Project } from "@cyrus/hooks/types";
