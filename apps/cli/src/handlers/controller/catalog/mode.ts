import { orpcOk } from "@cyrus/errors/orpc";
import type { ControllerDeps } from "../deps";

export function modeHandlers({ os, runtime }: ControllerDeps) {
	return {
		getModes: os.getModes.handler(async ({ input }) => ({
			modes: orpcOk(
				await runtime.threadCoordinator.catalog(input.threadId, "mode", {
					type: "get",
				})
			),
		})),
		setMode: os.setMode.handler(async ({ input }) => {
			orpcOk(
				await runtime.threadCoordinator.catalog(input.threadId, "mode", {
					type: "set",
					projectId: input.projectId,
					value: input.modeId,
				})
			);
			return {};
		}),
	};
}
