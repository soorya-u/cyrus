import type { GitError } from "@cyrus/errors/git";
import { Result } from "better-result";
import { initRepository } from "es-git";
import { operationFailedFromUnknown } from "./open";

export async function initGitRepository(
	cwd: string
): Promise<Result<void, GitError>> {
	return (await Result.tryPromise(() => initRepository(cwd)))
		.map(() => undefined)
		.mapError(operationFailedFromUnknown);
}
