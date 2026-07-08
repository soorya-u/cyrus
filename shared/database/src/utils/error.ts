import { Result } from "better-result";

export type RepositoryError =
	| { type: "not_found"; entity: string; id: string }
	| { type: "database"; message: string }
	| { type: "persist_failed"; message: string };

export function notFound(entity: string, id: string): RepositoryError {
	return { type: "not_found", entity, id };
}

export function repositoryErrorMessage(error: RepositoryError): string {
	switch (error.type) {
		case "not_found":
			return `${error.entity} not found: ${error.id}`;
		case "database":
		case "persist_failed":
			return error.message;
		default:
			return error;
	}
}

function fromUnknown(error: unknown): RepositoryError {
	if (
		typeof error === "object" &&
		error !== null &&
		"type" in error &&
		(error as RepositoryError).type !== undefined
	) {
		return error as RepositoryError;
	}
	return {
		type: "database",
		message: error instanceof Error ? error.message : String(error),
	};
}

export async function tryRepo<T>(
	fn: () => Promise<T>
): Promise<Result<T, RepositoryError>> {
	return (await Result.tryPromise(fn)).mapError(fromUnknown);
}
