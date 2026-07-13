import type { GitRef, GitRefsOutput } from "@cyrus/schemas/rtc/git";
import { Result } from "better-result";
import { openGitRepository } from "./open";

export async function listGitRefs(
	cwd: string,
	query?: string
): Promise<GitRefsOutput> {
	const opened = await openGitRepository(cwd);
	if (opened.isErr()) return { isRepo: false, refs: [] };

	const repo = opened.value;
	const current = Result.try(() => repo.head().shorthand()).match({
		ok: (name) => name,
		err: () => null,
	});
	const normalizedQuery = query?.trim().toLowerCase();

	const refs: GitRef[] = [];
	for (const branch of repo.branches()) {
		if (branch.type !== "Local") continue;
		if (
			normalizedQuery &&
			!branch.name.toLowerCase().includes(normalizedQuery)
		) {
			continue;
		}
		refs.push({
			name: branch.name,
			current: branch.name === current,
		});
	}

	return { isRepo: true, refs };
}
