import {
	createProject as createStoredProject,
	deleteProject as deleteStoredProject,
	listProjects,
	renameProject,
} from "@cyrus/database/repositories/projects";
import {
	deleteThreadsForProject,
	listThreads,
} from "@cyrus/database/repositories/threads";
import { notFound } from "@cyrus/database/utils/error";
import { throwOrpcFromRepositoryError } from "@/utils/error";
import type { ControllerDeps } from "./deps";

export function projectsHandlers({ os, runtime }: ControllerDeps) {
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
			const listed = await listThreads(input.projectId);
			if (listed.isErr()) throwOrpcFromRepositoryError(listed.error);

			for (const thread of listed.value) {
				if (thread.sessionId && thread.agentName) {
					await runtime.threadCoordinator.closeThreadSession(
						thread.id,
						thread.sessionId,
						thread.agentName
					);
				}
			}

			const deleted = await deleteStoredProject(input.projectId);
			if (deleted.isErr()) throwOrpcFromRepositoryError(deleted.error);
			if (!deleted.value) {
				throwOrpcFromRepositoryError(notFound("project", input.projectId));
			}

			const threads = await deleteThreadsForProject(input.projectId);
			if (threads.isErr()) throwOrpcFromRepositoryError(threads.error);
			return {};
		}),
	};
}
