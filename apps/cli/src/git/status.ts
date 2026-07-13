import type {
	GitFileChange,
	GitFileStatus,
	GitStatusOutput,
} from "@cyrus/schemas/rtc/git";
import { Result } from "better-result";
import { log } from "evlog";
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

	const status = Result.try(() => {
		const diff = repo.diffTreeToWorkdirWithIndex(
			headTree.value,
			WORKING_TREE_DIFF_OPTIONS
		);
		diff.findSimilar({ renames: true });

		const files: GitFileChange[] = [];
		for (const delta of diff.deltas()) {
			const path = filePath(delta);
			if (!path) continue;
			files.push({
				path,
				status: mapFileStatus(delta.status()),
				insertions: 0,
				deletions: 0,
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

	if (status.isErr()) {
		log.error({ kind: "git_status_error", error: status.error });
		return { isRepo: false };
	}

	return status.value;
}
