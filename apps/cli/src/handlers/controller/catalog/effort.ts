import { throwOrpc } from "@cyrus/errors/orpc";
import type { ControllerDeps } from "../deps";

export function effortHandlers({ os, runtime }: ControllerDeps) {
	return {
		getEfforts: os.getEfforts.handler(async ({ input }) =>
			(await runtime.threadCoordinator.getEfforts(input.threadId)).match({
				ok: (efforts) => ({ efforts }),
				err: throwOrpc,
			})
		),
		setEffort: os.setEffort.handler(async ({ input }) => {
			const result = await runtime.threadCoordinator.setEffort(
				input.threadId,
				input.projectId,
				input.effortId
			);
			return result.match({
				ok: () => ({}),
				err: throwOrpc,
			});
		}),
	};
}
