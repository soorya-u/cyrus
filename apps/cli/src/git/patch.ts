import type { GitError } from "@cyrus/errors/git";
import { Result } from "better-result";
import { WORKING_TREE_DIFF_OPTIONS } from "./diff-options";
import { openGitRepository, operationFailedFromUnknown } from "./open";

export async function getGitPatch(
	cwd: string,
	path?: string
): Promise<Result<string, GitError>> {
	const opened = await openGitRepository(cwd);
	if (opened.isErr()) return Result.err(opened.error);

	return Result.try(() => {
		const headTree = opened.value.head().peelToTree();
		const diff = opened.value.diffTreeToWorkdirWithIndex(headTree, {
			...WORKING_TREE_DIFF_OPTIONS,
			...(path ? { pathspecs: [path] } : {}),
		});
		diff.findSimilar({ renames: true });
		return diff.print();
	}).mapError(operationFailedFromUnknown);
}
