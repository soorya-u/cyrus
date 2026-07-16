import { orpcOk } from "@cyrus/errors/orpc";
import type { ControllerDeps } from "../deps";

export function personaHandlers({ os, runtime }: ControllerDeps) {
	return {
		getPersona: os.getPersona.handler(async ({ input }) => ({
			personas: orpcOk(
				await runtime.threadCoordinator.getPersonas(input.threadId)
			),
		})),
		setPersona: os.setPersona.handler(async ({ input }) => {
			orpcOk(
				await runtime.threadCoordinator.setPersona(
					input.threadId,
					input.projectId,
					input.personaId
				)
			);
			return {};
		}),
	};
}
