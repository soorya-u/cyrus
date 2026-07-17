import { isCoordinatorError } from "@cyrus/errors/coordinator";
import { isTurnError } from "@cyrus/errors/turn";

export function coordinatorErrorCode(error: unknown): string | undefined {
	if (isCoordinatorError(error) || isTurnError(error)) return error._tag;
}

export function coordinatorErrorMessage(error: unknown): string {
	if (isCoordinatorError(error) || isTurnError(error)) return error.message;
	if (
		error instanceof Error &&
		"cause" in error &&
		error.cause instanceof Error
	) {
		return error.cause.message;
	}
	if (error instanceof Error) return error.message;
	return String(error);
}
