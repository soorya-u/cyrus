import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useRtc } from "../contexts/rtc";

export function useProjects() {
	const queryClient = useQueryClient();
	const { orpc: orpcController } = useRtc();

	const listProjectsQuery = useQuery({
		...orpcController.listProjects.queryOptions({
			queryKey: RTC_OPERATION_KEYS.listProjects,
		}),
		queryKey: RTC_OPERATION_KEYS.listProjects,
	});

	const projects = useMemo(
		() => listProjectsQuery.data?.projects ?? [],
		[listProjectsQuery.data?.projects]
	);

	function invalidateProjects() {
		queryClient.invalidateQueries({
			queryKey: RTC_OPERATION_KEYS.listProjects,
		});
	}

	function invalidateThreads(projectId?: string) {
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
	}

	const createProjectMutation = useMutation({
		...orpcController.createProject.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.createProject,
		}),
		onSuccess: invalidateProjects,
	});

	const renameProjectMutation = useMutation({
		...orpcController.renameProject.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.renameProject,
		}),
		onSuccess: invalidateProjects,
	});

	const deleteProjectMutation = useMutation({
		...orpcController.deleteProject.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.deleteProject,
		}),
		onSuccess: () => {
			invalidateProjects();
			invalidateThreads();
		},
	});

	async function createProject(name: string, cwd: string): Promise<string> {
		const { project } = await createProjectMutation.mutateAsync({
			name,
			cwd,
		});
		return project.id;
	}

	function renameProject(id: string, name: string) {
		renameProjectMutation.mutate({ projectId: id, name });
	}

	function removeProject(id: string) {
		deleteProjectMutation.mutate({ projectId: id });
	}

	return {
		projects,
		isLoading: listProjectsQuery.isLoading,
		invalidateThreads,
		createProject,
		renameProject,
		removeProject,
	};
}

export type { Project } from "@cyrus/schemas/rtc/projects";
