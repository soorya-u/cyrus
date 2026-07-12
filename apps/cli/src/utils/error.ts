import type { RepositoryError } from "@cyrus/database/utils/error";
import {
	repositoryErrorMessage,
	repositoryOrpcCode,
} from "@cyrus/database/utils/error";
import { ORPCError } from "@orpc/server";
import {
	type CoordinatorError,
	coordinatorErrorMessage,
	coordinatorOrpcCode,
} from "@/errors/coordinator";

export function toMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function throwOrpcFromRepositoryError(error: RepositoryError): never {
	throw new ORPCError(repositoryOrpcCode(error), {
		message: repositoryErrorMessage(error),
	});
}

export function throwOrpcFromCoordinatorError(error: CoordinatorError): never {
	throw new ORPCError(coordinatorOrpcCode(error), {
		message: coordinatorErrorMessage(error),
	});
}
