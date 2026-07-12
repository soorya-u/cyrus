import { throwOrpcFromCoordinatorError } from "@/utils/error";
import type { ControllerDeps } from "../deps";

export function personaHandlers({ os, runtime }: ControllerDeps) {
	return {
		getPersona: os.getPersona.handler(async ({ input }) =>
			(await runtime.threadCoordinator.getPersonas(input.threadId)).match({
				ok: (personas) => ({ personas }),
				err: throwOrpcFromCoordinatorError,
			})
		),
		setPersona: os.setPersona.handler(async ({ input }) => {
			const result = await runtime.threadCoordinator.setPersona(
				input.threadId,
				input.projectId,
				input.personaId
			);
			return result.match({
				ok: () => ({}),
				err: throwOrpcFromCoordinatorError,
			});
		}),
	};
}
