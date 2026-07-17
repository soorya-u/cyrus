import { throwOrpc } from "@cyrus/errors/orpc";
import { listHealthyAgents } from "@/core/agents/health";
import type { ControllerDeps } from "./deps";

export function agentsHandlers({ os, runtime }: ControllerDeps) {
	return {
		listAgents: os.listAgents.handler(async () => ({
			agents: await listHealthyAgents(),
		})),

		getDraftCatalog: os.getDraftCatalog.handler(async ({ input }) => {
			const result = await runtime.threadCoordinator.getDraftCatalog(
				input.agentName,
				input.projectId
			);
			if (result.isErr()) throwOrpc(result.error);
			return result.value;
		}),
	};
}
