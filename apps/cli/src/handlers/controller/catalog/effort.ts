import { orpcOk } from "@cyrus/errors/orpc";
import type { ControllerDeps } from "../deps";

export function effortHandlers({ os, runtime }: ControllerDeps) {
	return {
		getEfforts: os.getEfforts.handler(async ({ input }) => ({
			efforts: orpcOk(
				await runtime.threadCoordinator.catalog(input.threadId, "effort", {
					type: "get",
				})
			),
		})),
		setEffort: os.setEffort.handler(async ({ input }) => {
			orpcOk(
				await runtime.threadCoordinator.catalog(input.threadId, "effort", {
					type: "set",
					projectId: input.projectId,
					value: input.effortId,
				})
			);
			return {};
		}),
	};
}
