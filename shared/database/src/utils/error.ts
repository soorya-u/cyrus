import { matchError, Result, TaggedError } from "better-result";

export class RepositoryNotFoundError extends TaggedError("not_found")<{
	entity: string;
	id: string;
}>() {}

export class RepositoryDatabaseError extends TaggedError("database")<{
	message: string;
}>() {}

export class RepositoryPersistFailedError extends TaggedError(
	"persist_failed"
)<{
	message: string;
}>() {}

export type RepositoryError =
	| RepositoryNotFoundError
	| RepositoryDatabaseError
	| RepositoryPersistFailedError;

export function notFound(entity: string, id: string): RepositoryNotFoundError {
	return new RepositoryNotFoundError({ entity, id });
}

export function databaseError(message: string): RepositoryDatabaseError {
	return new RepositoryDatabaseError({ message });
}

export function persistFailed(message: string): RepositoryPersistFailedError {
	return new RepositoryPersistFailedError({ message });
}

export function repositoryErrorMessage(error: RepositoryError): string {
	return matchError(error, {
		not_found: (value) => `${value.entity} not found: ${value.id}`,
		database: (value) => value.message,
		persist_failed: (value) => value.message,
	});
}

export function repositoryOrpcCode(
	error: RepositoryError
): "NOT_FOUND" | "INTERNAL_SERVER_ERROR" {
	return matchError(error, {
		not_found: () => "NOT_FOUND",
		database: () => "INTERNAL_SERVER_ERROR",
		persist_failed: () => "INTERNAL_SERVER_ERROR",
	});
}

function fromUnknown(error: unknown): RepositoryError {
	if (RepositoryNotFoundError.is(error)) return error;
	if (RepositoryDatabaseError.is(error)) return error;
	if (RepositoryPersistFailedError.is(error)) return error;
	return databaseError(error instanceof Error ? error.message : String(error));
}

export async function tryRepo<T>(
	fn: () => Promise<T>
): Promise<Result<T, RepositoryError>> {
	return (await Result.tryPromise(fn)).mapError(fromUnknown);
}
