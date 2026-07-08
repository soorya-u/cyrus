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
		default: {
			const _exhaustive: never = error;
			return _exhaustive;
		}
	}
}

function isRepositoryError(error: unknown): error is RepositoryError {
	if (typeof error !== "object" || error === null || !("type" in error))
		return false;

	const type = (error as { type: unknown }).type;
	return (
		type === "not_found" || type === "database" || type === "persist_failed"
	);
}

function fromUnknown(error: unknown): RepositoryError {
	if (isRepositoryError(error)) return error;
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
