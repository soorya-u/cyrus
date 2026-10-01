import type { GitFileChange, GitStatusOutput } from "@cyrus/schemas/rtc/git";
import { Result } from "better-result";
import { log } from "evlog";
import { openGitRepository } from "./open";
import { buildWorkingTreeFiles } from "./working-tree";

export async function getGitStatus(cwd: string): Promise<GitStatusOutput> {
	const opened = await openGitRepository(cwd);
	if (opened.isErr()) return { isRepo: false };

	const repo = opened.value;
	const headTree = Result.try(() => repo.head().peelToTree());
	if (headTree.isErr()) {
		return {
			isRepo: true,
			refName: null,
			files: [],
			insertions: 0,
			deletions: 0,
		};
	}

	const built = await buildWorkingTreeFiles(cwd, repo, headTree.value);
	if (built.isErr()) {
		log.error({ kind: "git_status_error", error: built.error });
		return { isRepo: false };
	}

	const files: GitFileChange[] = built.value.map(
		({ path, status, insertions, deletions }) => ({
			path,
			status,
			insertions,
			deletions,
		})
	);
	const refName = Result.try(() => repo.head().shorthand()).match({
		ok: (name) => name,
		err: () => null,
	});

	return {
		isRepo: true as const,
		refName,
		files,
		insertions: files.reduce((total, file) => total + file.insertions, 0),
		deletions: files.reduce((total, file) => total + file.deletions, 0),
	};
}
