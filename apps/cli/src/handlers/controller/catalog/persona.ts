import type { ControllerDeps } from "../deps";

export function personaHandlers({ os, runtime }: ControllerDeps) {
	return {
		getPersona: os.getPersona.handler(async ({ input }) => ({
			personas: await runtime.threadCoordinator.getPersonas(input.agentName),
		})),
		setPersona: os.setPersona.handler(async ({ input }) => {
			await runtime.threadCoordinator.setPersona(
				input.agentName,
				input.threadId,
				input.projectId,
				input.personaId
			);
			return {};
		}),
	};
}
