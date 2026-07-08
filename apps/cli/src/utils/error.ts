import type { RepositoryError } from "@cyrus/database/utils/error";
import { repositoryErrorMessage } from "@cyrus/database/utils/error";
import { ORPCError } from "@orpc/server";

export function toMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function throwOrpcFromRepositoryError(error: RepositoryError): never {
	const code =
		error.type === "not_found" ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR";
	throw new ORPCError(code, { message: repositoryErrorMessage(error) });
}
