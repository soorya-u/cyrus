import { TaggedError } from "better-result";
import { errorModules, errorTag, isModuleError } from "./common";

const tags = {
	notFound: errorTag(errorModules.repository, "not_found"),
	database: errorTag(errorModules.repository, "database"),
	persistFailed: errorTag(errorModules.repository, "persist_failed"),
} as const;

export class RepositoryNotFoundError extends TaggedError(tags.notFound)<{
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

export class RepositoryDatabaseError extends TaggedError(tags.database)<{
	message: string;
	detail?: string;
}>() {
	get orpcCode() {
		return "INTERNAL_SERVER_ERROR" as const;
	}
}

export class RepositoryPersistFailedError extends TaggedError(
	tags.persistFailed
)<{
	message: string;
	detail?: string;
}>() {
	get orpcCode() {
		return "INTERNAL_SERVER_ERROR" as const;
	}
}

export type RepositoryError =
	| RepositoryNotFoundError
	| RepositoryDatabaseError
	| RepositoryPersistFailedError;

export function isRepositoryError(cause: unknown): cause is RepositoryError {
	return isModuleError(cause, errorModules.repository);
}

export function notFound(entity: string, id: string): RepositoryNotFoundError {
	return new RepositoryNotFoundError({ entity, id });
}

export function databaseError(
	message: string,
	detail?: string
): RepositoryDatabaseError {
	return new RepositoryDatabaseError({ message, detail });
}

export function persistFailed(
	message: string,
	detail?: string
): RepositoryPersistFailedError {
	return new RepositoryPersistFailedError({ message, detail });
}
