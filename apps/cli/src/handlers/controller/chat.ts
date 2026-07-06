import type { ChatChunk } from "@cyrus/connections/schemas/rtc/chat";
import { env } from "@/lib/env";
import { appendConversation, ensureThread } from "@/store/threads";
import type { ControllerDeps } from "./deps";

export function chatHandlers({ os, runtime }: ControllerDeps) {
	return {
		chat: os.chat.handler(async function* ({ input, context }) {
			const {
				agentName,
				threadId = Bun.randomUUIDv7(),
				message,
				projectId,
			} = input;

			ensureThread(threadId, projectId, { agentName, firstMessage: message });

			const turnId = Bun.randomUUIDv7();

			function emit(event: ChatChunk["event"]): ChatChunk {
				const chunk = { threadId, turnId, event };
				context.broadcaster.broadcast(chunk, context.peerId);
				appendConversation(threadId, chunk);
				return chunk;
			}

			yield emit({ type: "user_message", content: message });
			yield emit({ type: "thread_started", threadId });

			const gen = runtime.threadCoordinator.prompt(
				agentName,
				threadId,
				projectId,
				message
			);
			for await (const event of gen) {
				yield emit(event);
				await Bun.sleep(env.CYRUS_STREAM_THROTTLING_MS);
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
