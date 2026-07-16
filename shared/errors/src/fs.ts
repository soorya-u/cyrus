import { TaggedError } from "better-result";
import { errorModules, errorTag, isModuleError } from "./common";

const tags = {
	notFound: errorTag(errorModules.fs, "not_found"),
	operationFailed: errorTag(errorModules.fs, "operation_failed"),
} as const;

export class FsNotFoundError extends TaggedError(tags.notFound)<{
	path: string;
	message: string;
}>() {
	get orpcCode() {
		return "NOT_FOUND" as const;
	}
}

export class FsOperationFailedError extends TaggedError(tags.operationFailed)<{
	message: string;
	detail?: string;
}>() {
	get orpcCode() {
		return "INTERNAL_SERVER_ERROR" as const;
	}
}

export type FsError = FsNotFoundError | FsOperationFailedError;

export function isFsError(cause: unknown): cause is FsError {
	return isModuleError(cause, errorModules.fs);
}

export function fsNotFoundError(
	path: string,
	message?: string
): FsNotFoundError {
	return new FsNotFoundError({
		path,
		message: message ?? `path not found: ${path}`,
	});
}

export function fsOperationFailedError(
	message: string,
	detail?: string
): FsOperationFailedError {
	return new FsOperationFailedError({ message, detail });
}

export function fsErrorFromUnknown(error: unknown, path = ""): FsError {
	if (isFsError(error)) return error;

	if (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code: unknown }).code === "ENOENT"
	) {
		return fsNotFoundError(
			path,
			error instanceof Error ? error.message : undefined
		);
	}
	return fsOperationFailedError(
		error instanceof Error ? error.message : String(error)
	);
}
