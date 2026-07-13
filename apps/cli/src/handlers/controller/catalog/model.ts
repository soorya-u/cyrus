import { throwOrpc } from "@cyrus/errors/orpc";
import type { ControllerDeps } from "../deps";

export function modelHandlers({ os, runtime }: ControllerDeps) {
	return {
		getModels: os.getModels.handler(async ({ input }) =>
			(await runtime.threadCoordinator.getModels(input.threadId)).match({
				ok: (models) => ({ models }),
				err: throwOrpc,
			})
		),
		setModel: os.setModel.handler(async ({ input }) => {
			const result = await runtime.threadCoordinator.setModel(
				input.threadId,
				input.projectId,
				input.modelId
			);
			return result.match({
				ok: () => ({}),
				err: throwOrpc,
			});
		}),
	};
}
