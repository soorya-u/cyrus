import { env } from "@/lib/env";
import { appendConversation, ensureThread } from "@/mocks/threads";
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

			const started = { type: "thread_started" as const, threadId };
			context.broadcaster.broadcast(started, context.peerId);
			appendConversation(threadId, started);
			yield started;

			const gen = runtime.threadCoordinator.prompt(
				agentName,
				threadId,
				projectId,
				message
			);
			for await (const event of gen) {
				context.broadcaster.broadcast(event, context.peerId);
				appendConversation(threadId, event);
				yield event;
				await Bun.sleep(env.CYRUS_STREAM_THROTTLING_MS);
			}
		}),

		subscribe: os.subscribe.handler(async function* ({ context }) {
			for await (const event of context.broadcaster.subscribe(context.peerId))
				yield event;
		}),
	};
}
