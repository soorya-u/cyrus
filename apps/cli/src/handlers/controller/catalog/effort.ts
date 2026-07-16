import { orpcOk } from "@cyrus/errors/orpc";
import type { ControllerDeps } from "../deps";

export function effortHandlers({ os, runtime }: ControllerDeps) {
	return {
		getEfforts: os.getEfforts.handler(async ({ input }) => ({
			efforts: orpcOk(
				await runtime.threadCoordinator.getEfforts(input.threadId)
			),
		})),
		setEffort: os.setEffort.handler(async ({ input }) => {
			orpcOk(
				await runtime.threadCoordinator.setEffort(
					input.threadId,
					input.projectId,
					input.effortId
				)
			);
			return {};
		}),
	};
}
