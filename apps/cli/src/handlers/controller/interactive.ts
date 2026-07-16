import { appendConversation } from "@cyrus/database/repositories/conversations";
import {
	coordinatorNoPendingApproval,
	coordinatorNoPendingElicitation,
} from "@cyrus/errors/coordinator";
import { orpcOk, throwOrpc } from "@cyrus/errors/orpc";
import { interactivePending } from "@/core/acp/interactive";
import type { ControllerDeps } from "./deps";

export function interactiveHandlers({ os }: ControllerDeps) {
	return {
		respondApproval: os.respondApproval.handler(async ({ input, context }) => {
			const resolved = interactivePending.respondApproval(input);
			if (!resolved) {
				throwOrpc(coordinatorNoPendingApproval());
			}

			const turnIds = context.eventBus.getActiveTurnIdsForThread(
				input.threadId
			);
			const turnId = resolved.turnId || turnIds[0];
			if (!turnId) return {};

			const entry = orpcOk(
				await appendConversation(input.threadId, {
					threadId: input.threadId,
					turnId,
					event: {
						type: "approval_resolved",
						toolCallId: input.toolCallId,
						optionId: input.optionId,
					},
				})
			);
			context.eventBus.publish(entry.chunk);
			return {};
		}),

		respondElicitation: os.respondElicitation.handler(
			async ({ input, context }) => {
				const resolved = interactivePending.respondElicitation(input);
				if (!resolved) {
					throwOrpc(coordinatorNoPendingElicitation());
				}

				const turnIds = context.eventBus.getActiveTurnIdsForThread(
					input.threadId
				);
				const turnId = resolved.turnId || turnIds[0];
				if (!turnId) return {};

				const entry = orpcOk(
					await appendConversation(input.threadId, {
						threadId: input.threadId,
						turnId,
						event: {
							type: "elicitation_resolved",
							elicitationId: input.elicitationId,
							action: input.action,
						},
					})
				);
				context.eventBus.publish(entry.chunk);
				return {};
			}
		),
	};
}
