import { appendConversation } from "@cyrus/database/repositories/conversations";
import { ensureThread } from "@cyrus/database/repositories/threads";
import type { ChatChunk } from "@cyrus/schemas/rtc/chat";
import { randomId } from "@cyrus/utils/identity";
import { env } from "@/lib/env";
import { throwOrpcFromRepositoryError } from "@/utils/error";
import {
	isStreamingDelta,
	resolvePersistEvent,
	trackDelta,
} from "@/utils/streams";
import type { ControllerDeps } from "./deps";

export function chatHandlers({ os, runtime }: ControllerDeps) {
	return {
		chat: os.chat.handler(async function* ({ input, context }) {
			const { agentName, threadId = randomId(), message, projectId } = input;

			const thread = await ensureThread(threadId, projectId, {
				agentName,
				firstMessage: message,
			});
			if (thread.isErr()) throwOrpcFromRepositoryError(thread.error);

			const turnId = randomId();
			const messageBuffers = new Map<string, string>();
			const thoughtBuffers = new Map<string, string>();

			async function emit(event: ChatChunk["event"]): Promise<ChatChunk> {
				trackDelta(event, messageBuffers, thoughtBuffers);

				if (isStreamingDelta(event)) {
					const chunk: ChatChunk = { threadId, turnId, seq: 0, event };
					context.broadcaster.broadcast(chunk, context.peerId);
					return chunk;
				}

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
				if (entry.isErr()) throwOrpcFromRepositoryError(entry.error);
				const chunk = entry.value.chunk;
				context.broadcaster.broadcast(chunk, context.peerId);
				return chunk;
			}

			yield await emit({ type: "user_message", content: message });
			yield await emit({ type: "thread_started", threadId });

			const gen = runtime.threadCoordinator.prompt(
				agentName,
				threadId,
				projectId,
				message
			);
			try {
				for await (const event of gen) {
					yield await emit(event);
					await Bun.sleep(env.CYRUS_STREAM_THROTTLING_MS);
				}
				yield await emit({ type: "turn_completed" });
			} catch (error) {
				yield await emit({ type: "turn_interrupted" });
				throw error;
			}
		}),

		subscribe: os.subscribe.handler(async function* ({ context }) {
			for await (const chunk of context.broadcaster.subscribe(context.peerId))
				yield chunk;
		}),

		cancel: os.cancel.handler(async ({ input }) => {
			await runtime.threadCoordinator.cancel(input.agentName, input.threadId);
			return {};
		}),
	};
}
