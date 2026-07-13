import { throwOrpc } from "@cyrus/errors/orpc";
import type { ControllerDeps } from "../deps";

export function modeHandlers({ os, runtime }: ControllerDeps) {
	return {
		getModes: os.getModes.handler(async ({ input }) =>
			(await runtime.threadCoordinator.getModes(input.threadId)).match({
				ok: (modes) => ({ modes }),
				err: throwOrpc,
			})
		),
		setMode: os.setMode.handler(async ({ input }) => {
			const result = await runtime.threadCoordinator.setMode(
				input.threadId,
				input.projectId,
				input.modeId
			);
			return result.match({
				ok: () => ({}),
				err: throwOrpc,
			});
		}),
	};
}
