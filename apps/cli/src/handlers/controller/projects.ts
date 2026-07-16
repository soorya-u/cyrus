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
import { orpcOk, throwOrpc } from "@cyrus/errors/orpc";
import { notFound } from "@cyrus/errors/repository";
import type { ControllerDeps } from "./deps";

export function projectsHandlers({ os, runtime }: ControllerDeps) {
	return {
		listProjects: os.listProjects.handler(async () => ({
			projects: orpcOk(await listProjects()),
		})),

		createProject: os.createProject.handler(async ({ input }) => ({
			project: orpcOk(await createStoredProject(input.name, input.cwd)),
		})),

		renameProject: os.renameProject.handler(async ({ input }) => {
			orpcOk(await renameProject(input.projectId, input.name));
			return {};
		}),

		deleteProject: os.deleteProject.handler(async ({ input }) => {
			const listed = orpcOk(await listThreads(input.projectId));

			for (const thread of listed) {
				await runtime.threadCoordinator.closeAnyThreadSession(thread.id);
			}

			const deleted = orpcOk(await deleteStoredProject(input.projectId));
			if (!deleted) {
				throwOrpc(notFound("project", input.projectId));
			}

			orpcOk(await deleteThreadsForProject(input.projectId));
			return {};
		}),
	};
}
