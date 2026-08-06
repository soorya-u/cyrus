import { TaggedError } from "better-result";
import { errorModules, errorTag } from "./common";
import type { EmptyPayload } from "./orpc";

const tags = {
	notRepository: errorTag(errorModules.git, "not_repository"),
	operationFailed: errorTag(errorModules.git, "operation_failed"),
	branchCheckedOut: errorTag(errorModules.git, "branch_checked_out"),
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

export class GitBranchCheckedOutError extends TaggedError(
	tags.branchCheckedOut
)<{
	branch: string;
	path: string;
}>() {
	get message() {
		return `Branch '${this.branch}' is already checked out at ${this.path}`;
	}

	get orpcCode() {
		return "BAD_REQUEST" as const;
	}
}

export type GitError =
	| GitNotRepositoryError
	| GitOperationFailedError
	| GitBranchCheckedOutError;

export function notRepositoryError(): GitError {
	return new GitNotRepositoryError({});
}

export function operationFailedError(
	message: string,
	detail?: string
): GitError {
	return new GitOperationFailedError({ message, detail });
}

export function branchAlreadyCheckedOutError(
	branch: string,
	path: string
): GitError {
	return new GitBranchCheckedOutError({ branch, path });
}
