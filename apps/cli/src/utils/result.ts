import type { Result } from "better-result";
import { print } from "./style";

/** CLI exit messages: a string, or any TaggedError-like value with `.message`. */
export type ExitMessage = string | { readonly message: string };

/** Print an error and exit the CLI process. */
export function exitWithError(error: ExitMessage, code = 1): never {
	print.error`${typeof error === "string" ? error : error.message}`;
	process.exit(code);
}

/** Unwrap a Result at a CLI command boundary; prints and exits on Err. */
export function unwrapOrExit<T, E extends ExitMessage>(
	result: Result<T, E>,
	code = 1
): T {
	if (result.isErr()) exitWithError(result.error, code);
	return result.value;
}
