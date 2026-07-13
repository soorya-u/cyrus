import type {
	GitFileChange,
	GitFileStatus,
	GitStatusOutput,
} from "@cyrus/schemas/rtc/git";
import { Result } from "better-result";
import { WORKING_TREE_DIFF_OPTIONS } from "./diff-options";
import { openGitRepository } from "./open";

const FILE_STATUSES = new Set<GitFileStatus>([
	"Added",
	"Deleted",
	"Modified",
	"Renamed",
	"Untracked",
]);

function mapFileStatus(status: string): GitFileStatus {
	if (FILE_STATUSES.has(status as GitFileStatus)) {
		return status as GitFileStatus;
	}
	return "Modified";
}

function filePath(delta: {
	oldFile: () => { path: () => string | null };
	newFile: () => { path: () => string | null };
}): string {
	return delta.newFile().path() ?? delta.oldFile().path() ?? "";
}

export async function getGitStatus(cwd: string): Promise<GitStatusOutput> {
	const opened = await openGitRepository(cwd);
	if (opened.isErr()) return { isRepo: false };

	const status = Result.try(() => {
		const repo = opened.value;
		const headTree = repo.head().peelToTree();
		const diff = repo.diffTreeToWorkdirWithIndex(
			headTree,
			WORKING_TREE_DIFF_OPTIONS
		);
		diff.findSimilar({ renames: true });

		const files: GitFileChange[] = [];
		for (const delta of diff.deltas()) {
			const path = filePath(delta);
			if (!path) continue;
			const fileDiff = repo.diffTreeToWorkdirWithIndex(headTree, {
				...WORKING_TREE_DIFF_OPTIONS,
				pathspecs: [path],
			});
			const stats = fileDiff.stats();
			files.push({
				path,
				status: mapFileStatus(delta.status()),
				insertions: Number(stats.insertions),
				deletions: Number(stats.deletions),
			});
		}

		const totals = diff.stats();
		const refName = Result.try(() => repo.head().shorthand()).match({
			ok: (name) => name,
			err: () => null,
		});

		return {
			isRepo: true as const,
			refName,
			files,
			insertions: Number(totals.insertions),
			deletions: Number(totals.deletions),
		};
	});

	return status.match({
		ok: (value) => value,
		err: () => ({
			isRepo: true,
			refName: null,
			files: [],
			insertions: 0,
			deletions: 0,
		}),
	});
}
