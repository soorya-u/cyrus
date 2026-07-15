import { throwOrpc } from "@cyrus/errors/orpc";
import { listHealthyAgents } from "@/core/agents/health";
import { persistCoordinatorThreadError } from "@/utils/thread-errors";
import type { ControllerDeps } from "./deps";

export function agentsHandlers({ os, runtime }: ControllerDeps) {
	return {
		listAgents: os.listAgents.handler(async () => ({
			agents: await listHealthyAgents(),
		})),

		bindAgent: os.bindAgent.handler(async ({ input }) => {
			const result = await runtime.threadCoordinator.bindAgent(
				input.threadId,
				input.projectId,
				input.agentName
			);
			if (result.isErr()) {
				await persistCoordinatorThreadError(input.threadId, result.error);
				throwOrpc(result.error);
			}
			return result.value;
		}),
	};
}
