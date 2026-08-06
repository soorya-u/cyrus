import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ComposerBranchToolbar } from "./composer-branch-toolbar";

const useGitStatusMock = vi.fn();
const useProjectGitStatusMock = vi.fn();
const useListGitRefsMock = vi.fn();
const useListProjectGitRefsMock = vi.fn();
const useCheckoutRefMock = vi.fn();
const useCreateWorktreeMock = vi.fn();

vi.mock("@cyrus/hooks/queries/use-git", () => ({
	useGitStatus: (arg: unknown) => useGitStatusMock(arg),
	useProjectGitStatus: (arg: unknown) => useProjectGitStatusMock(arg),
	useListGitRefs: (arg: unknown) => useListGitRefsMock(arg),
	useListProjectGitRefs: (arg: unknown) => useListProjectGitRefsMock(arg),
	useCheckoutRef: () => useCheckoutRefMock(),
	useCreateWorktree: () => useCreateWorktreeMock(),
}));

vi.mock("@cyrus/hooks/stores/local-draft", () => ({
	useLocalDraftStore: (
		selector: (state: {
			gitByDraft: Record<string, unknown>;
			setBranch: () => void;
			setWorktree: () => void;
		}) => unknown
	) =>
		selector({
			gitByDraft: {},
			setBranch: vi.fn(),
			setWorktree: vi.fn(),
		}),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

function idleQuery() {
	return { data: undefined, isLoading: false };
}

function idleMutation() {
	return { mutate: vi.fn(), reset: vi.fn(), error: null, isPending: false };
}

beforeEach(() => {
	vi.clearAllMocks();
	useGitStatusMock.mockReturnValue({
		data: { isRepo: true, refName: "main" },
	});
	useProjectGitStatusMock.mockReturnValue({
		data: { isRepo: true, refName: "main" },
	});
	useListGitRefsMock.mockReturnValue(idleQuery());
	useListProjectGitRefsMock.mockReturnValue(idleQuery());
	useCheckoutRefMock.mockReturnValue(idleMutation());
	useCreateWorktreeMock.mockReturnValue(idleMutation());
});

describe("ComposerBranchToolbar", () => {
	test("does not fetch the ref list until the branch dropdown opens", async () => {
		const user = userEvent.setup();
		render(
			<ComposerBranchToolbar subject={{ id: "thread-1", projectId: "p1" }} />
		);

		expect(useListGitRefsMock).toHaveBeenLastCalledWith(undefined);

		await user.click(screen.getByRole("button", { name: "main" }));

		expect(useListGitRefsMock).toHaveBeenLastCalledWith("thread-1");
	});

	test("defers the project ref list for drafts until the dropdown opens", async () => {
		const user = userEvent.setup();
		render(
			<ComposerBranchToolbar
				localDraft
				subject={{ id: "draft-1", projectId: "project-1" }}
			/>
		);

		expect(useListProjectGitRefsMock).toHaveBeenLastCalledWith(undefined);

		await user.click(screen.getByRole("button", { name: "main" }));

		expect(useListProjectGitRefsMock).toHaveBeenLastCalledWith("project-1");
	});

	test("locks the workspace selector for committed threads regardless of worktree state", () => {
		render(
			<ComposerBranchToolbar subject={{ id: "thread-1", projectId: "p1" }} />
		);

		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
		expect(screen.getByText("Current checkout")).toBeInTheDocument();
	});

	test("keeps the workspace selector editable for drafts", () => {
		render(
			<ComposerBranchToolbar
				localDraft
				subject={{ id: "draft-1", projectId: "p1" }}
			/>
		);

		expect(screen.getByRole("combobox")).toBeInTheDocument();
	});

	test("toasts a branch checkout conflict instead of rendering it inline", () => {
		useCheckoutRefMock.mockReturnValue({
			mutate: vi.fn(),
			reset: vi.fn(),
			error: { message: "Branch 'fix' is already checked out at /path" },
			isPending: false,
		});

		render(
			<ComposerBranchToolbar subject={{ id: "thread-1", projectId: "p1" }} />
		);

		expect(toast.error).toHaveBeenCalledWith(
			"Branch 'fix' is already checked out at /path"
		);
		expect(
			screen.queryByText("Branch 'fix' is already checked out at /path")
		).not.toBeInTheDocument();
	});
});
