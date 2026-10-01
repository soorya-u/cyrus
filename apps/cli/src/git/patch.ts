import type { GitError } from "@cyrus/errors/git";
import { Result } from "better-result";
import { openGitRepository, operationFailedFromUnknown } from "./open";
import { buildWorkingTreeFiles } from "./working-tree";

export async function getGitPatch(
	cwd: string,
	path?: string
): Promise<Result<string, GitError>> {
	const opened = await openGitRepository(cwd);
	if (opened.isErr()) return Result.err(opened.error);

	const headTree = Result.try(() => opened.value.head().peelToTree());
	if (headTree.isErr()) {
		return Result.err(operationFailedFromUnknown(headTree.error));
	}

	const files = await buildWorkingTreeFiles(
		cwd,
		opened.value,
		headTree.value,
		path
	);
	return files.map((built) => built.map((file) => file.patch).join(""));
}
