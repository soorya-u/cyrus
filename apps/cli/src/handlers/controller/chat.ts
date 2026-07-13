import { appendConversation } from "@cyrus/database/repositories/conversations";
import {
	ensureThread,
	getThread,
	setAgentLocked,
} from "@cyrus/database/repositories/threads";
import { throwOrpc } from "@cyrus/errors/orpc";
import type { ChatChunk } from "@cyrus/schemas/rtc/chat";
import { randomId } from "@cyrus/utils/identity";
import { ORPCError } from "@orpc/server";
import { log } from "evlog";
import { runTurn } from "@/utils/run-turn";
import {
	isStreamingDelta,
	resolvePersistEvent,
	trackDelta,
} from "@/utils/streams";
import type { ControllerDeps } from "./deps";

export function chatHandlers({ os, runtime }: ControllerDeps) {
	return {
		chat: os.chat.handler(async ({ input, context }) => {
			const {
				agentName,
				threadId = randomId(),
				turnId = randomId(),
				message,
				projectId,
			} = input;

			const existing = await getThread(threadId);
			if (existing.isErr()) throwOrpc(existing.error);
			if (!(existing.value?.sessionId && existing.value.agentName))
				throw new ORPCError("BAD_REQUEST", {
					message: "agent must be bound before chat; call bindAgent first",
				});

			if (existing.value.agentName !== agentName)
				throw new ORPCError("BAD_REQUEST", {
					message: "agentName does not match the bound thread agent",
				});

			const thread = await ensureThread(threadId, projectId, {
				firstMessage: message,
			});
			if (thread.isErr()) throwOrpc(thread.error);

			const messageBuffers = new Map<string, string>();
			const thoughtBuffers = new Map<string, string>();

			context.eventBus.ensureWatch(context.peerId, threadId);

			function publishChunk(chunk: ChatChunk): void {
				context.eventBus.publish(chunk);
			}

			async function emit(event: ChatChunk["event"]): Promise<void> {
				trackDelta(event, messageBuffers, thoughtBuffers);

				if (isStreamingDelta(event))
					return publishChunk({ threadId, turnId, seq: 0, event });

				const persistEvent = resolvePersistEvent(
					event,
					messageBuffers,
					thoughtBuffers
				);
				const entry = await appendConversation(threadId, {
					threadId,
					turnId,
					event: persistEvent,
				});
				if (entry.isErr()) throwOrpc(entry.error);
				if (persistEvent.type === "user_message") {
					const locked = await setAgentLocked(threadId);
					if (locked.isErr()) throwOrpc(locked.error);
				}
				publishChunk(entry.value.chunk);
			}

			async function emitTerminal(
				event: Extract<
					ChatChunk["event"],
					{ type: "turn_completed" | "turn_interrupted" }
				>
			): Promise<void> {
				trackDelta(event, messageBuffers, thoughtBuffers);

				const persistEvent = resolvePersistEvent(
					event,
					messageBuffers,
					thoughtBuffers
				);
				const entry = await appendConversation(threadId, {
					threadId,
					turnId,
					event: persistEvent,
				});

				if (entry.isOk()) {
					publishChunk(entry.value.chunk);
					return;
				}

				log.error({
					kind: "terminal_event_persist",
					error: entry.error,
					threadId,
					turnId,
					event: event.type,
				});
				publishChunk({ threadId, turnId, seq: 0, event });
			}

			runTurn({
				agentName,
				threadId,
				projectId,
				message,
				emit,
				emitTerminal,
				runtime,
			})
				.then((result) => {
					result.tapError((error) => {
						log.error({ kind: "chat_turn_failed", error, threadId, turnId });
					});
				})
				.catch((error) => {
					log.error({ kind: "chat_turn_failed", error, threadId, turnId });
				});

			return { threadId, turnId };
		}),

		subscribe: os.subscribe.handler(async function* ({ context }) {
			for await (const chunk of context.eventBus.subscribe(context.peerId))
				yield chunk;
		}),

		cancel: os.cancel.handler(async ({ input, context }) => {
			const snapshottedTurnIds = context.eventBus.getActiveTurnIdsForThread(
				input.threadId
			);

			await runtime.threadCoordinator.cancel(input.agentName, input.threadId);

			const stillActiveTurnIds = new Set(
				context.eventBus.getActiveTurnIdsForThread(input.threadId)
			);

			for (const turnId of snapshottedTurnIds) {
				if (!stillActiveTurnIds.has(turnId)) continue;
				context.eventBus.publish({
					threadId: input.threadId,
					turnId,
					seq: 0,
					event: { type: "turn_interrupted" },
				});
			}

			return {};
		}),
	};
}
