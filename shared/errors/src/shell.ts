import { TaggedError } from "better-result";
import { errorModules, errorTag } from "./common";

const tags = {
	spawnFailed: errorTag(errorModules.shell, "spawn_failed"),
	streamFailed: errorTag(errorModules.shell, "stream_failed"),
} as const;

export class ShellSpawnFailedError extends TaggedError(tags.spawnFailed)<{
	message: string;
	detail?: string;
}>() {
	get orpcCode() {
		return "INTERNAL_SERVER_ERROR" as const;
	}
}

export class ShellStreamFailedError extends TaggedError(tags.streamFailed)<{
	message: string;
	detail?: string;
}>() {
	get orpcCode() {
		return "INTERNAL_SERVER_ERROR" as const;
	}
}

export function shellSpawnFailed(
	message: string,
	detail?: string
): ShellSpawnFailedError {
	return new ShellSpawnFailedError({ message, detail });
}

export function shellStreamFailed(
	message: string,
	detail?: string
): ShellStreamFailedError {
	return new ShellStreamFailedError({ message, detail });
}

export function shellErrorMessageFromUnknown(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof error.message === "string"
	)
		return error.message;

	return String(error);
}
