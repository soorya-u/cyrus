import type { ControllerDeps } from "../deps";

export function modelHandlers({ os, runtime }: ControllerDeps) {
	return {
		getModels: os.getModels.handler(async ({ input }) => ({
			models: await runtime.threadCoordinator.getModels(input.agentName),
		})),
		setModel: os.setModel.handler(async ({ input }) => {
			await runtime.threadCoordinator.setModel(
				input.agentName,
				input.threadId,
				input.projectId,
				input.modelId
			);
			return {};
		}),
	};
}
