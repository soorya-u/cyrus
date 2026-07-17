import { orpcOk } from "@cyrus/errors/orpc";
import type { ControllerDeps } from "../deps";

export function personaHandlers({ os, runtime }: ControllerDeps) {
	return {
		getPersona: os.getPersona.handler(async ({ input }) => ({
			personas: orpcOk(
				await runtime.threadCoordinator.catalog(input.threadId, "persona", {
					type: "get",
				})
			),
		})),
		setPersona: os.setPersona.handler(async ({ input }) => {
			orpcOk(
				await runtime.threadCoordinator.catalog(input.threadId, "persona", {
					type: "set",
					projectId: input.projectId,
					value: input.personaId,
				})
			);
			return {};
		}),
	};
}
