import type { ChatChunk, ChatMessage } from "@cyrus/schemas/rtc/chat";
import { formatPromptBlocks } from "@cyrus/schemas/rtc/chat";
import { Result } from "better-result";
import type { WorkerRuntime } from "@/core";

type RunTurnOptions = {
	agentName: string;
	threadId: string;
	projectId: string;
	message: ChatMessage;
	emit: (event: ChatChunk["event"]) => Promise<void>;
	emitTerminal: (
		event: Extract<
			ChatChunk["event"],
			{ type: "turn_completed" | "turn_interrupted" }
		>
	) => Promise<void>;
	runtime: WorkerRuntime;
};

export async function runTurn({
	agentName,
	threadId,
	projectId,
	message,
	emit,
	emitTerminal,
	runtime,
}: RunTurnOptions): Promise<Result<void, unknown>> {
	const started = await Result.tryPromise(async () => {
		await emit({
			type: "user_message",
			content: formatPromptBlocks(message),
			blocks: message,
		});
		await emit({ type: "thread_started", threadId });
	});
	if (started.isErr()) {
		await emitTerminal({ type: "turn_interrupted" });
		return started;
	}

	const promptResult = await runtime.threadCoordinator.prompt(
		agentName,
		threadId,
		projectId,
		message
	);
	if (promptResult.isErr()) {
		await emitTerminal({ type: "turn_interrupted" });
		return Result.err(promptResult.error);
	}

	const streamed = await Result.tryPromise(async () => {
		for await (const event of promptResult.value) await emit(event);
	});

	if (streamed.isErr()) {
		await emitTerminal({ type: "turn_interrupted" });
		return streamed;
	}

	await emitTerminal({ type: "turn_completed" });
	return Result.ok(undefined);
}
