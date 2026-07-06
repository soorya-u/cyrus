import { ORPCError } from "@orpc/server";
import { Result } from "better-result";
import {
	createProject as createStoredProject,
	deleteProject as deleteStoredProject,
	listProjects,
	renameProject,
} from "@/store/projects";
import { deleteThreadsForProject } from "@/store/threads";
import type { ControllerOs } from "./deps";

export function projectsHandlers(os: ControllerOs) {
	return {
		listProjects: os.listProjects.handler(async () => ({
			projects: listProjects(),
		})),

		createProject: os.createProject.handler(({ input }) => ({
			project: createStoredProject(input.name, input.cwd),
		})),

		renameProject: os.renameProject.handler(({ input }) =>
			Result.try(() => renameProject(input.projectId, input.name)).match({
				ok: () => ({}),
				err: () => {
					throw new ORPCError("NOT_FOUND", {
						message: `project not found: ${input.projectId}`,
					});
				},
			})
		),

		deleteProject: os.deleteProject.handler(({ input }) => {
			const deleted = deleteStoredProject(input.projectId);
			if (!deleted)
				throw new ORPCError("NOT_FOUND", {
					message: `project not found: ${input.projectId}`,
				});

			deleteThreadsForProject(input.projectId);
			return {};
		}),
	};
}
