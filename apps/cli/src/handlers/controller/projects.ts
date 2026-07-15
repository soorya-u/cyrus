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
import { throwOrpc } from "@cyrus/errors/orpc";
import { notFound } from "@cyrus/errors/repository";
import type { ControllerDeps } from "./deps";

export function projectsHandlers({ os, runtime }: ControllerDeps) {
	return {
		listProjects: os.listProjects.handler(async () =>
			(await listProjects()).match({
				ok: (projects) => ({ projects }),
				err: throwOrpc,
			})
		),

		createProject: os.createProject.handler(async ({ input }) =>
			(await createStoredProject(input.name, input.cwd)).match({
				ok: (project) => ({ project }),
				err: throwOrpc,
			})
		),

		renameProject: os.renameProject.handler(async ({ input }) =>
			(await renameProject(input.projectId, input.name)).match({
				ok: () => ({}),
				err: throwOrpc,
			})
		),

		deleteProject: os.deleteProject.handler(async ({ input }) => {
			const listed = await listThreads(input.projectId);
			if (listed.isErr()) throwOrpc(listed.error);

			for (const thread of listed.value) {
				await runtime.threadCoordinator.closeAnyThreadSession(thread.id);
			}

			const deleted = await deleteStoredProject(input.projectId);
			if (deleted.isErr()) throwOrpc(deleted.error);
			if (!deleted.value) {
				throwOrpc(notFound("project", input.projectId));
			}

			const threads = await deleteThreadsForProject(input.projectId);
			if (threads.isErr()) throwOrpc(threads.error);
			return {};
		}),
	};
}
