import { orpcOk } from "@cyrus/errors/orpc";
import type { ControllerDeps } from "../deps";

export function modelHandlers({ os, runtime }: ControllerDeps) {
	return {
		getModels: os.getModels.handler(async ({ input }) => ({
			models: orpcOk(await runtime.threadCoordinator.getModels(input.threadId)),
		})),
		setModel: os.setModel.handler(async ({ input }) => {
			orpcOk(
				await runtime.threadCoordinator.setModel(
					input.threadId,
					input.projectId,
					input.modelId
				)
			);
			return {};
		}),
	};
}
