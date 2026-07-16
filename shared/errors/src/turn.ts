import { TaggedError } from "better-result";
import { errorModules, errorTag, isModuleError } from "./common";
import type { EmptyPayload } from "./orpc";

const tags = {
	emitFailed: errorTag(errorModules.turn, "emit_failed"),
	streamFailed: errorTag(errorModules.turn, "stream_failed"),
	interrupted: errorTag(errorModules.turn, "interrupted"),
	aborted: errorTag(errorModules.turn, "aborted"),
	waitFailed: errorTag(errorModules.turn, "wait_failed"),
} as const;

export class TurnEmitFailedError extends TaggedError(tags.emitFailed)<{
	message: string;
	detail?: string;
}>() {
	get orpcCode() {
		return "INTERNAL_SERVER_ERROR" as const;
	}
}

export class TurnStreamFailedError extends TaggedError(tags.streamFailed)<{
	message: string;
	detail?: string;
}>() {
	get orpcCode() {
		return "INTERNAL_SERVER_ERROR" as const;
	}
}

export class TurnInterruptedError extends TaggedError(
	tags.interrupted
)<EmptyPayload>() {
	get message() {
		return "turn interrupted";
	}

	get orpcCode() {
		return "BAD_REQUEST" as const;
	}
}

export class TurnAbortedError extends TaggedError(
	tags.aborted
)<EmptyPayload>() {
	get message() {
		return "turn aborted";
	}

	get orpcCode() {
		return "BAD_REQUEST" as const;
	}
}

export class TurnWaitFailedError extends TaggedError(tags.waitFailed)<{
	message: string;
	detail?: string;
}>() {
	get orpcCode() {
		return "INTERNAL_SERVER_ERROR" as const;
	}
}

export type TurnError =
	| TurnEmitFailedError
	| TurnStreamFailedError
	| TurnInterruptedError
	| TurnAbortedError
	| TurnWaitFailedError;

export type TurnWaitError =
	| TurnInterruptedError
	| TurnAbortedError
	| TurnWaitFailedError;

export function isTurnError(cause: unknown): cause is TurnError {
	return isModuleError(cause, errorModules.turn);
}

export function isTurnInterruptedError(
	cause: unknown
): cause is TurnInterruptedError {
	return TurnInterruptedError.is(cause);
}

export function turnEmitFailed(
	message: string,
	detail?: string
): TurnEmitFailedError {
	return new TurnEmitFailedError({ message, detail });
}

export function turnStreamFailed(
	message: string,
	detail?: string
): TurnStreamFailedError {
	return new TurnStreamFailedError({ message, detail });
}

export function turnInterrupted(): TurnInterruptedError {
	return new TurnInterruptedError({});
}

export function turnAborted(): TurnAbortedError {
	return new TurnAbortedError({});
}

export function turnWaitFailed(
	message: string,
	detail?: string
): TurnWaitFailedError {
	return new TurnWaitFailedError({ message, detail });
}

export function turnErrorMessageFromUnknown(error: unknown): string {
	if (
		error instanceof Error &&
		"cause" in error &&
		error.cause instanceof Error
	) {
		return error.cause.message;
	}
	if (error instanceof Error) return error.message;
	if (
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof error.message === "string"
	) {
		return error.message;
	}
	return String(error);
}
