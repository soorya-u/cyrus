import { TaggedError } from "better-result";
import { errorModules, errorTag } from "./common";
import type { EmptyPayload } from "./orpc";

const tags = {
	notRepository: errorTag(errorModules.git, "not_repository"),
	operationFailed: errorTag(errorModules.git, "operation_failed"),
} as const;

export class GitNotRepositoryError extends TaggedError(
	tags.notRepository
)<EmptyPayload>() {
	get message() {
		return "Not a git repository";
	}

	get orpcCode() {
		return "BAD_REQUEST" as const;
	}
}

export class GitOperationFailedError extends TaggedError(tags.operationFailed)<{
	message: string;
	detail?: string;
}>() {
	get orpcCode() {
		return "BAD_REQUEST" as const;
	}
}

export type GitError = GitNotRepositoryError | GitOperationFailedError;

export function notRepositoryError(): GitError {
	return new GitNotRepositoryError({});
}

export function operationFailedError(
	message: string,
	detail?: string
): GitError {
	return new GitOperationFailedError({ message, detail });
}
