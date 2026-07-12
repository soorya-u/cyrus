import type { RepositoryError } from "@cyrus/database/utils/error";
import {
	repositoryErrorMessage,
	repositoryOrpcCode,
} from "@cyrus/database/utils/error";
import { matchError, TaggedError } from "better-result";

export class CoordinatorNotFoundError extends TaggedError("not_found")<{
	entity: string;
	id: string;
}>() {}

export class CoordinatorAgentLockedError extends TaggedError("agent_locked")<
	Record<string, never>
>() {}

export class CoordinatorAgentNotBoundError extends TaggedError(
	"agent_not_bound"
)<Record<string, never>>() {}

export class CoordinatorAgentMismatchError extends TaggedError(
	"agent_mismatch"
)<{
	expected: string;
	actual: string;
}>() {}

export class CoordinatorRepositoryError extends TaggedError("repository")<{
	error: RepositoryError;
}>() {}

export class CoordinatorRuntimeError extends TaggedError("runtime")<{
	message: string;
}>() {}

export type CoordinatorError =
	| CoordinatorNotFoundError
	| CoordinatorAgentLockedError
	| CoordinatorAgentNotBoundError
	| CoordinatorAgentMismatchError
	| CoordinatorRepositoryError
	| CoordinatorRuntimeError;

export function coordinatorNotFound(
	entity: string,
	id: string
): CoordinatorNotFoundError {
	return new CoordinatorNotFoundError({ entity, id });
}

export function coordinatorAgentLocked(): CoordinatorAgentLockedError {
	return new CoordinatorAgentLockedError({});
}

export function coordinatorAgentNotBound(): CoordinatorAgentNotBoundError {
	return new CoordinatorAgentNotBoundError({});
}

export function coordinatorAgentMismatch(
	expected: string,
	actual: string
): CoordinatorAgentMismatchError {
	return new CoordinatorAgentMismatchError({ expected, actual });
}

export function coordinatorRepositoryError(
	error: RepositoryError
): CoordinatorRepositoryError {
	return new CoordinatorRepositoryError({ error });
}

export function coordinatorRuntimeError(
	message: string
): CoordinatorRuntimeError {
	return new CoordinatorRuntimeError({ message });
}

export function coordinatorErrorMessage(error: CoordinatorError): string {
	return matchError(error, {
		not_found: (value) => `${value.entity} not found: ${value.id}`,
		agent_locked: () => "agent is locked for this thread",
		agent_not_bound: () =>
			"agent must be bound before using catalog operations",
		agent_mismatch: (value) =>
			`agent ${value.actual} does not match bound agent ${value.expected}`,
		repository: (value) => repositoryErrorMessage(value.error),
		runtime: (value) => value.message,
	});
}

export function coordinatorOrpcCode(
	error: CoordinatorError
): "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL_SERVER_ERROR" {
	return matchError(error, {
		not_found: () => "NOT_FOUND",
		agent_locked: () => "BAD_REQUEST",
		agent_not_bound: () => "BAD_REQUEST",
		agent_mismatch: () => "BAD_REQUEST",
		repository: (value) => repositoryOrpcCode(value.error),
		runtime: () => "INTERNAL_SERVER_ERROR",
	});
}
