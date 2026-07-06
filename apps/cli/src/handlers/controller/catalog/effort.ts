import type { ControllerDeps } from "../deps";

export function effortHandlers({ os, runtime }: ControllerDeps) {
	return {
		getEfforts: os.getEfforts.handler(async ({ input }) => ({
			efforts: await runtime.threadCoordinator.getEfforts(input.agentName),
		})),
		setEffort: os.setEffort.handler(async ({ input }) => {
			await runtime.threadCoordinator.setEffort(
				input.agentName,
				input.threadId,
				input.projectId,
				input.effortId
			);
			return {};
		}),
	};
}
