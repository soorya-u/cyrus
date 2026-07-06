import type { ControllerDeps } from "../deps";

export function modeHandlers({ os, runtime }: ControllerDeps) {
	return {
		getModes: os.getModes.handler(async ({ input }) => ({
			modes: await runtime.threadCoordinator.getModes(input.agentName),
		})),
		setMode: os.setMode.handler(async ({ input }) => {
			await runtime.threadCoordinator.setMode(
				input.agentName,
				input.threadId,
				input.projectId,
				input.modeId
			);
			return {};
		}),
	};
}
