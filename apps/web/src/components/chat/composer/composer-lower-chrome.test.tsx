import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { ComposerLowerChrome } from "./composer-lower-chrome";

vi.mock("@/components/chat/composer/composer-branch-toolbar", () => ({
	ComposerBranchToolbar: () => (
		<div data-testid="branch-toolbar">branch toolbar</div>
	),
}));

const subject = { id: "draft-1", projectId: "p1" };
const BRANCH_WORKTREE_TOGGLE_NAME = /branch.*worktree/i;

describe("ComposerLowerChrome", () => {
	test("renders the branch toolbar directly for a git-repo draft, with no intermediate toggle", () => {
		render(<ComposerLowerChrome isGitRepo localDraft subject={subject} />);

		expect(screen.getByTestId("branch-toolbar")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: BRANCH_WORKTREE_TOGGLE_NAME })
		).not.toBeInTheDocument();
	});

	test("renders nothing when the project isn't a git repo", () => {
		render(
			<ComposerLowerChrome isGitRepo={false} localDraft subject={subject} />
		);

		expect(screen.queryByTestId("branch-toolbar")).not.toBeInTheDocument();
	});
});
