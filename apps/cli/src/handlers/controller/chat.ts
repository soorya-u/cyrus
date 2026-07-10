import { appendConversation } from "@cyrus/database/repositories/conversations";
import { ensureThread } from "@cyrus/database/repositories/threads";
import type { ChatChunk } from "@cyrus/schemas/rtc/chat";
import { randomId } from "@cyrus/utils/identity";
import { Result } from "better-result";
import { throwOrpcFromRepositoryError } from "@/utils/error";
import {
	isStreamingDelta,
	resolvePersistEvent,
	trackDelta,
} from "@/utils/streams";
import type { ControllerDeps } from "./deps";

type RunTurnOptions = {
	agentName: string;
	threadId: string;
	projectId: string;
	message: string;
	turnId: string;
	emit: (event: ChatChunk["event"]) => Promise<void>;
	runtime: ControllerDeps["runtime"];
};

async function runTurn({
	agentName,
	threadId,
	projectId,
	message,
	emit,
	emitTerminal,
	runtime,
}: Omit<RunTurnOptions, "turnId" | "emitTerminal"> & {
	emitTerminal: (
		event: Extract<
			ChatChunk["event"],
			{ type: "turn_completed" | "turn_interrupted" }
		>
	) => Promise<void>;
}): Promise<Result<void, unknown>> {
	const started = await Result.tryPromise(async () => {
		await emit({ type: "user_message", content: message });
		await emit({ type: "thread_started", threadId });
	});
	if (started.isErr()) return started;

	const streamed = await Result.tryPromise(async () => {
		const gen = runtime.threadCoordinator.prompt(
			agentName,
			threadId,
			projectId,
			message
		);
		for await (const event of gen) await emit(event);
	});

	if (streamed.isErr()) {
		await emitTerminal({ type: "turn_interrupted" });
		return streamed;
	}

	await emitTerminal({ type: "turn_completed" });
	return Result.ok(undefined);
}

export function chatHandlers({ os, runtime }: ControllerDeps) {
	return {
		chat: os.chat.handler(async ({ input, context }) => {
			const { agentName, threadId = randomId(), message, projectId } = input;

			const thread = await ensureThread(threadId, projectId, {
				agentName,
				firstMessage: message,
			});
			if (thread.isErr()) throwOrpcFromRepositoryError(thread.error);

			const turnId = randomId();
			const messageBuffers = new Map<string, string>();
			const thoughtBuffers = new Map<string, string>();

			context.eventBus.ensureWatch(context.peerId, threadId);

			function publishChunk(chunk: ChatChunk): void {
				context.eventBus.publish(chunk);
			}

			async function emit(event: ChatChunk["event"]): Promise<void> {
				trackDelta(event, messageBuffers, thoughtBuffers);

				if (isStreamingDelta(event)) {
					publishChunk({ threadId, turnId, seq: 0, event });
					return;
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

				console.error("terminal event persist failed", entry.error);
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
						console.error("chat turn failed", error);
					});
				})
				.catch((error) => {
					console.error("chat turn failed", error);
				});

			return { threadId, turnId };
		}),

		subscribe: os.subscribe.handler(async function* ({ context }) {
			for await (const chunk of context.eventBus.subscribe(context.peerId))
				yield chunk;
		}),

		cancel: os.cancel.handler(async ({ input }) => {
			await runtime.threadCoordinator.cancel(input.agentName, input.threadId);
			return {};
		}),
	};
}
