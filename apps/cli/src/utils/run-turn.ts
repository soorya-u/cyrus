import type { CoordinatorError } from "@cyrus/errors/coordinator";
import {
	type TurnError,
	turnEmitFailed,
	turnErrorMessageFromUnknown,
	turnStreamFailed,
} from "@cyrus/errors/turn";
import type { ChatChunk, ChatMessage } from "@cyrus/schemas/rtc/chat";
import { formatPromptBlocks } from "@cyrus/schemas/rtc/chat";
import { Result } from "better-result";
import type { WorkerRuntime } from "@/core";
import {
	coordinatorErrorCode,
	coordinatorErrorMessage,
} from "@/utils/thread-errors";

type RunTurnError = TurnError | CoordinatorError;

type RunTurnOptions = {
	agentName: string;
	threadId: string;
	projectId: string;
	turnId: string;
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
	turnId,
	message,
	emit,
	emitTerminal,
	runtime,
}: RunTurnOptions): Promise<Result<void, RunTurnError>> {
	const started = await Result.tryPromise(async () => {
		await emit({
			type: "user_message",
			content: formatPromptBlocks(message),
			blocks: message,
		});
		await emit({ type: "thread_started", threadId });
	});
	if (started.isErr()) {
		const error = turnEmitFailed(turnErrorMessageFromUnknown(started.error));
		await emit({
			type: "thread_error",
			message: error.message,
			code: error._tag,
		});
		await emitTerminal({ type: "turn_interrupted" });
		return Result.err(error);
	}

	const promptResult = await runtime.threadCoordinator.prompt(
		agentName,
		threadId,
		projectId,
		message,
		turnId
	);
	if (promptResult.isErr()) {
		await emit({
			type: "thread_error",
			message: coordinatorErrorMessage(promptResult.error),
			code: coordinatorErrorCode(promptResult.error),
		});
		await emitTerminal({ type: "turn_interrupted" });
		return Result.err(promptResult.error);
	}

	const streamed = await Result.tryPromise(async () => {
		for await (const event of promptResult.value) await emit(event);
	});

	if (streamed.isErr()) {
		const error = turnStreamFailed(turnErrorMessageFromUnknown(streamed.error));
		await emit({
			type: "thread_error",
			message: error.message,
			code: error._tag,
		});
		await emitTerminal({ type: "turn_interrupted" });
		return Result.err(error);
	}

	await emitTerminal({ type: "turn_completed" });
	return Result.ok(undefined);
}
