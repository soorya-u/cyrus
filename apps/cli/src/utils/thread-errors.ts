import { appendConversation } from "@cyrus/database/repositories/conversations";
import { getThread } from "@cyrus/database/repositories/threads";
import { isCoordinatorError } from "@cyrus/errors/coordinator";
import { isTurnError } from "@cyrus/errors/turn";
import type { ChatChunk } from "@cyrus/schemas/rtc/chat";
import { randomId } from "@cyrus/utils/identity";

export function coordinatorErrorCode(error: unknown): string | undefined {
	if (isCoordinatorError(error) || isTurnError(error)) return error._tag;
}

export function coordinatorErrorMessage(error: unknown): string {
	if (isCoordinatorError(error) || isTurnError(error)) return error.message;
	if (
		error instanceof Error &&
		"cause" in error &&
		error.cause instanceof Error
	) {
		return error.cause.message;
	}
	if (error instanceof Error) return error.message;
	return String(error);
}

export async function persistThreadError(
	threadId: string,
	turnId: string,
	message: string,
	code?: string
): Promise<ChatChunk["event"] | undefined> {
	const thread = await getThread(threadId);
	if (thread.isErr() || !thread.value) return;

	const event: ChatChunk["event"] = {
		type: "thread_error",
		message,
		...(code ? { code } : {}),
	};

	const entry = await appendConversation(threadId, {
		threadId,
		turnId,
		event,
	});
	if (entry.isErr()) return;

	return entry.value.chunk.event;
}

export async function persistCoordinatorThreadError(
	threadId: string,
	error: unknown,
	turnId = randomId()
): Promise<ChatChunk["event"] | undefined> {
	return await persistThreadError(
		threadId,
		turnId,
		coordinatorErrorMessage(error),
		coordinatorErrorCode(error)
	);
}
