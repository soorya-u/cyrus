import { Result } from "better-result";
import { WORKING_TREE_DIFF_OPTIONS } from "./diff-options";
import { openGitRepository } from "./open";

export async function getGitPatch(cwd: string, path?: string): Promise<string> {
	const opened = await openGitRepository(cwd);
	if (opened.isErr()) return "";

	const headTree = opened.value.head().peelToTree();
	const diff = opened.value.diffTreeToWorkdirWithIndex(headTree, {
		...WORKING_TREE_DIFF_OPTIONS,
		...(path ? { pathspecs: [path] } : {}),
	});
	diff.findSimilar({ renames: true });
	return Result.try(() => diff.print()).match({
		ok: (patch) => patch,
		err: () => "",
	});
}
