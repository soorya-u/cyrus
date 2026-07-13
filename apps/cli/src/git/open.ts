import { Result } from "better-result";
import { openRepository, type Repository } from "es-git";
import type { GitError } from "../errors/git";
import { notRepositoryError, operationFailedError } from "../errors/git";

function mapOpenError(error: unknown): GitError {
	const message = error instanceof Error ? error.message : String(error);
	if (message.toLowerCase().includes("not a git repository")) {
		return notRepositoryError();
	}
	return operationFailedError(message);
}

export function operationFailedFromUnknown(error: unknown): GitError {
	return operationFailedError(
		error instanceof Error ? error.message : String(error)
	);
}

export async function openGitRepository(
	cwd: string
): Promise<Result<Repository, GitError>> {
	return (await Result.tryPromise(() => openRepository(cwd))).mapError(
		mapOpenError
	);
}

export async function runGitOperationAsync<T>(
	operation: () => Promise<T>
): Promise<Result<T, GitError>> {
	return (await Result.tryPromise(operation)).mapError(
		operationFailedFromUnknown
	);
}
