import { appendConversation } from "@cyrus/database/repositories/conversations";
import { throwOrpc } from "@cyrus/errors/orpc";
import { ORPCError } from "@orpc/server";
import { interactivePending } from "@/core/acp/interactive";
import type { ControllerDeps } from "./deps";

export function interactiveHandlers({ os }: ControllerDeps) {
	return {
		respondApproval: os.respondApproval.handler(async ({ input, context }) => {
			const resolved = interactivePending.respondApproval(input);
			if (!resolved) {
				throw new ORPCError("BAD_REQUEST", {
					message: "no pending approval for this tool call",
				});
			}

			const turnIds = context.eventBus.getActiveTurnIdsForThread(
				input.threadId
			);
			const turnId = resolved.turnId || turnIds[0];
			if (!turnId) return {};

			const entry = await appendConversation(input.threadId, {
				threadId: input.threadId,
				turnId,
				event: {
					type: "approval_resolved",
					toolCallId: input.toolCallId,
					optionId: input.optionId,
				},
			});
			if (entry.isErr()) throwOrpc(entry.error);
			context.eventBus.publish(entry.value.chunk);
			return {};
		}),

		respondElicitation: os.respondElicitation.handler(
			async ({ input, context }) => {
				const resolved = interactivePending.respondElicitation(input);
				if (!resolved) {
					throw new ORPCError("BAD_REQUEST", {
						message: "no pending elicitation for this id",
					});
				}

				const turnIds = context.eventBus.getActiveTurnIdsForThread(
					input.threadId
				);
				const turnId = resolved.turnId || turnIds[0];
				if (!turnId) return {};

				const entry = await appendConversation(input.threadId, {
					threadId: input.threadId,
					turnId,
					event: {
						type: "elicitation_resolved",
						elicitationId: input.elicitationId,
						action: input.action,
					},
				});
				if (entry.isErr()) throwOrpc(entry.error);
				context.eventBus.publish(entry.value.chunk);
				return {};
			}
		),
	};
}
