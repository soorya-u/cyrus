import { throwOrpc } from "@cyrus/errors/orpc";
import type { ControllerDeps } from "../deps";

export function contextHandlers({ os, runtime }: ControllerDeps) {
	return {
		getContextUsage: os.getContextUsage.handler(async ({ input }) =>
			(await runtime.threadCoordinator.getContextUsage(input.threadId)).match({
				ok: (usage) => ({ usage }),
				err: throwOrpc,
			})
		),
	};
}
