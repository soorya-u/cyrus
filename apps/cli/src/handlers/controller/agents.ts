import {
	CoordinatorAgentLockedError,
	CoordinatorAgentMismatchError,
	CoordinatorAgentNotBoundError,
	CoordinatorNotFoundError,
} from "@cyrus/errors/coordinator";
import { throwOrpc } from "@cyrus/errors/orpc";
import { listHealthyAgents } from "@/core/agents/health";
import { persistCoordinatorThreadError } from "@/utils/thread-errors";
import type { ControllerDeps } from "./deps";

function shouldPersistBindError(error: unknown): boolean {
	return !(
		CoordinatorAgentLockedError.is(error) ||
		CoordinatorAgentMismatchError.is(error) ||
		CoordinatorAgentNotBoundError.is(error) ||
		CoordinatorNotFoundError.is(error)
	);
}

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
				if (shouldPersistBindError(result.error)) {
					await persistCoordinatorThreadError(input.threadId, result.error);
				}
				throwOrpc(result.error);
			}
			return result.value;
		}),

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
