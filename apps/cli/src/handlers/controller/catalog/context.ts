import { orpcOk } from "@cyrus/errors/orpc";
import type { ControllerDeps } from "../deps";

export function contextHandlers({ os, runtime }: ControllerDeps) {
	return {
		getContextUsage: os.getContextUsage.handler(async ({ input }) => ({
			usage: orpcOk(
				await runtime.threadCoordinator.getContextUsage(input.threadId)
			),
		})),
	};
}
