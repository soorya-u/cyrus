import { TaggedError } from "better-result";
import { errorModules, errorTag, isModuleError } from "./common";
import type { EmptyPayload } from "./orpc";
import type { RepositoryError } from "./repository";

const tags = {
	notFound: errorTag(errorModules.coordinator, "not_found"),
	agentLocked: errorTag(errorModules.coordinator, "agent_locked"),
	agentNotBound: errorTag(errorModules.coordinator, "agent_not_bound"),
	agentMismatch: errorTag(errorModules.coordinator, "agent_mismatch"),
	repository: errorTag(errorModules.coordinator, "repository"),
	runtime: errorTag(errorModules.coordinator, "runtime"),
	noPendingApproval: errorTag(errorModules.coordinator, "no_pending_approval"),
	noPendingElicitation: errorTag(
		errorModules.coordinator,
		"no_pending_elicitation"
	),
} as const;

export class CoordinatorNotFoundError extends TaggedError(tags.notFound)<{
	entity: string;
	id: string;
}>() {
	get message() {
		return `${this.entity} not found: ${this.id}`;
	}

	get orpcCode() {
		return "NOT_FOUND" as const;
	}
}

export class CoordinatorAgentLockedError extends TaggedError(
	tags.agentLocked
)<EmptyPayload>() {
	get message() {
		return "agent is locked for this thread";
	}

	get orpcCode() {
		return "BAD_REQUEST" as const;
	}
}

export class CoordinatorAgentNotBoundError extends TaggedError(
	tags.agentNotBound
)<EmptyPayload>() {
	get message() {
		return "agent must be bound before using catalog operations";
	}

	get orpcCode() {
		return "BAD_REQUEST" as const;
	}
}

export class CoordinatorAgentMismatchError extends TaggedError(
	tags.agentMismatch
)<{
	expected: string;
	actual: string;
}>() {
	get message() {
		return `agent ${this.actual} does not match bound agent ${this.expected}`;
	}

	get orpcCode() {
		return "BAD_REQUEST" as const;
	}
}

export class CoordinatorRepositoryError extends TaggedError(tags.repository)<{
	error: RepositoryError;
}>() {
	get message() {
		return this.error.message;
	}

	get orpcCode() {
		return this.error.orpcCode;
	}
}

export class CoordinatorRuntimeError extends TaggedError(tags.runtime)<{
	message: string;
	detail?: string;
}>() {
	get orpcCode() {
		return "INTERNAL_SERVER_ERROR" as const;
	}
}

export class CoordinatorNoPendingApprovalError extends TaggedError(
	tags.noPendingApproval
)<EmptyPayload>() {
	get message() {
		return "no pending approval for this tool call";
	}

	get orpcCode() {
		return "BAD_REQUEST" as const;
	}
}

export class CoordinatorNoPendingElicitationError extends TaggedError(
	tags.noPendingElicitation
)<EmptyPayload>() {
	get message() {
		return "no pending elicitation for this id";
	}

	get orpcCode() {
		return "BAD_REQUEST" as const;
	}
}

export type CoordinatorError =
	| CoordinatorNotFoundError
	| CoordinatorAgentLockedError
	| CoordinatorAgentNotBoundError
	| CoordinatorAgentMismatchError
	| CoordinatorRepositoryError
	| CoordinatorRuntimeError
	| CoordinatorNoPendingApprovalError
	| CoordinatorNoPendingElicitationError;

export function isCoordinatorError(cause: unknown): cause is CoordinatorError {
	return isModuleError(cause, errorModules.coordinator);
}

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
	message: string,
	detail?: string
): CoordinatorRuntimeError {
	return new CoordinatorRuntimeError({ message, detail });
}

export function coordinatorNoPendingApproval(): CoordinatorNoPendingApprovalError {
	return new CoordinatorNoPendingApprovalError({});
}

export function coordinatorNoPendingElicitation(): CoordinatorNoPendingElicitationError {
	return new CoordinatorNoPendingElicitationError({});
}
