import { orpcOk } from "@cyrus/errors/orpc";
import type { ControllerDeps } from "../deps";

export function modeHandlers({ os, runtime }: ControllerDeps) {
	return {
		getModes: os.getModes.handler(async ({ input }) => ({
			modes: orpcOk(await runtime.threadCoordinator.getModes(input.threadId)),
		})),
		setMode: os.setMode.handler(async ({ input }) => {
			orpcOk(
				await runtime.threadCoordinator.setMode(
					input.threadId,
					input.projectId,
					input.modeId
				)
			);
			return {};
		}),
	};
}
