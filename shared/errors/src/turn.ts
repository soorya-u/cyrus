import { TaggedError } from "better-result";
import { errorModules, errorTag, isModuleError } from "./common";

const tags = {
	emitFailed: errorTag(errorModules.turn, "emit_failed"),
	streamFailed: errorTag(errorModules.turn, "stream_failed"),
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

export type TurnError = TurnEmitFailedError | TurnStreamFailedError;

export function isTurnError(cause: unknown): cause is TurnError {
	return isModuleError(cause, errorModules.turn);
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
