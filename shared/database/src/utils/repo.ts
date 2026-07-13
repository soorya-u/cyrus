import {
	databaseError,
	isRepositoryError,
	type RepositoryError,
} from "@cyrus/errors/repository";
import { Result } from "better-result";
import { DrizzleError, DrizzleQueryError } from "drizzle-orm";
import { log } from "evlog";
import { ZodError } from "zod";

export function fromDrizzleFailure(
	cause: DrizzleError | DrizzleQueryError
): RepositoryError {
	const detail =
		cause instanceof DrizzleQueryError
			? `${cause.query} — ${cause.cause?.message ?? cause.message}`
			: cause.message || String(cause);

	return databaseError("Database operation failed", detail);
}

export function fromZodFailure(cause: ZodError): RepositoryError {
	return databaseError("Invalid data", cause.message);
}

export function fromRepoFailure(cause: unknown): RepositoryError {
	if (isRepositoryError(cause)) return cause;

	if (cause instanceof DrizzleQueryError || cause instanceof DrizzleError)
		return fromDrizzleFailure(cause);

	if (cause instanceof ZodError) return fromZodFailure(cause);

	return databaseError(
		"Something went wrong",
		cause instanceof Error ? cause.message : String(cause)
	);
}

export function repo<T>(
	fn: () => Promise<T>
): () => Promise<Result<T, RepositoryError>> {
	return () => runRepo(fn);
}

export function repoArgs<Args extends unknown[], T>(
	fn: (...args: Args) => Promise<T>
): (...args: Args) => Promise<Result<T, RepositoryError>> {
	return (...args) => runRepo(() => fn(...args));
}

function runRepo<T>(fn: () => Promise<T>): Promise<Result<T, RepositoryError>> {
	return Result.tryPromise({
		try: fn,
		catch: fromRepoFailure,
	}).then((result) =>
		result.tapError((error) =>
			log.error({
				kind: "repository_error",
				tag: error._tag,
				detail: "detail" in error ? error.detail : undefined,
				error,
			})
		)
	);
}
