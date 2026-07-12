import { listHealthyAgents } from "@/core/agents/health";
import { throwOrpcFromCoordinatorError } from "@/utils/error";
import type { ControllerDeps } from "./deps";

export function agentsHandlers({ os, runtime }: ControllerDeps) {
	return {
		listAgents: os.listAgents.handler(async () => ({
			agents: await listHealthyAgents(),
		})),

		bindAgent: os.bindAgent.handler(async ({ input }) =>
			(
				await runtime.threadCoordinator.bindAgent(
					input.threadId,
					input.projectId,
					input.agentName
				)
			).match({
				ok: (output) => output,
				err: throwOrpcFromCoordinatorError,
			})
		),
	};
}
