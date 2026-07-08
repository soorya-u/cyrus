import {
	createProject as createStoredProject,
	deleteProject as deleteStoredProject,
	listProjects,
	renameProject,
} from "@cyrus/database/repositories/projects";
import { deleteThreadsForProject } from "@cyrus/database/repositories/threads";
import { throwOrpcFromRepositoryError } from "@/utils/error";
import type { ControllerOs } from "./deps";

export function projectsHandlers(os: ControllerOs) {
	return {
		listProjects: os.listProjects.handler(async () =>
			(await listProjects()).match({
				ok: (projects) => ({ projects }),
				err: throwOrpcFromRepositoryError,
			})
		),

		createProject: os.createProject.handler(async ({ input }) =>
			(await createStoredProject(input.name, input.cwd)).match({
				ok: (project) => ({ project }),
				err: throwOrpcFromRepositoryError,
			})
		),

		renameProject: os.renameProject.handler(async ({ input }) =>
			(await renameProject(input.projectId, input.name)).match({
				ok: () => ({}),
				err: throwOrpcFromRepositoryError,
			})
		),

		deleteProject: os.deleteProject.handler(async ({ input }) => {
			const deleted = await deleteStoredProject(input.projectId);
			if (deleted.isErr()) throwOrpcFromRepositoryError(deleted.error);
			if (!deleted.value) {
				throwOrpcFromRepositoryError({
					type: "not_found",
					entity: "project",
					id: input.projectId,
				});
			}

			const threads = await deleteThreadsForProject(input.projectId);
			if (threads.isErr()) throwOrpcFromRepositoryError(threads.error);
			return {};
		}),
	};
}
