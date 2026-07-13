import { matchError, TaggedError } from "better-result";

export class GitNotRepositoryError extends TaggedError("not_repository")<
	Record<string, never>
>() {}

export class GitOperationFailedError extends TaggedError("operation_failed")<{
	message: string;
}>() {}

export type GitError = GitNotRepositoryError | GitOperationFailedError;

export function gitErrorMessage(error: GitError): string {
	return matchError(error, {
		not_repository: () => "Not a git repository",
		operation_failed: (value) => value.message,
	});
}

export function notRepositoryError(): GitError {
	return new GitNotRepositoryError({});
}

export function operationFailedError(message: string): GitError {
	return new GitOperationFailedError({ message });
}
