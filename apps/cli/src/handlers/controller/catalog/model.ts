import { orpcOk } from "@cyrus/errors/orpc";
import type { ControllerDeps } from "../deps";

export function modelHandlers({ os, runtime }: ControllerDeps) {
	return {
		getModels: os.getModels.handler(async ({ input }) => ({
			models: orpcOk(
				await runtime.threadCoordinator.catalog(input.threadId, "model", {
					type: "get",
				})
			),
		})),
		setModel: os.setModel.handler(async ({ input }) => {
			orpcOk(
				await runtime.threadCoordinator.catalog(input.threadId, "model", {
					type: "set",
					projectId: input.projectId,
					value: input.modelId,
				})
			);
			return {};
		}),
	};
}
