import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DiffTab } from "./diff-tab";

type TreeOptions = {
	onSelectionChange?: (paths: readonly string[]) => void;
	renderRowDecoration?: (context: {
		item: { path: string };
		row: { kind: "file" | "directory" };
	}) => { text: string; parts?: { text: string; color?: string }[] } | null;
};

let treeOptions: TreeOptions = {};
const deselect = vi.fn();
const model = {
	resetPaths: vi.fn(),
	batch: vi.fn(),
	setGitStatus: vi.fn(),
	getItem: vi.fn(() => ({ deselect })),
};
const useGitStatusMock = vi.fn();
const useGitPatchMock = vi.fn();

vi.mock("@pierre/trees/react", () => ({
	useFileTree: (options: TreeOptions) => {
		treeOptions = options;
		return { model };
	},
	FileTree: () => <div data-testid="tree" />,
}));

vi.mock("@pierre/diffs/react", () => ({
	PatchDiff: ({ patch }: { patch: string }) => (
		<pre data-testid="patch">{patch}</pre>
	),
}));

vi.mock("@cyrus/hooks/queries/use-git", () => ({
	useGitStatus: () => useGitStatusMock(),
	useGitPatch: (...args: unknown[]) => useGitPatchMock(...args),
}));

function status(files: unknown[], insertions = 0, deletions = 0) {
	return {
		data: { isRepo: true, refName: "main", files, insertions, deletions },
		isLoading: false,
		isFetching: false,
		refetch: vi.fn(),
	};
}

const FILES = [
	{ path: "src/a.ts", status: "Modified", insertions: 3, deletions: 2 },
	{ path: "src/new.ts", status: "Untracked", insertions: 4, deletions: 0 },
	{ path: "old.md", status: "Deleted", insertions: 0, deletions: 5 },
	{ path: "same.ts", status: "Modified", insertions: 0, deletions: 0 },
];

beforeEach(() => {
	vi.clearAllMocks();
	useGitPatchMock.mockReturnValue({
		data: { patch: "diff --git" },
		isLoading: false,
	});
});

describe("DiffTab", () => {
	test("shows a tree of changed files and a message when nothing changed", () => {
		useGitStatusMock.mockReturnValue(status(FILES, 7, 7));
		const { unmount } = render(<DiffTab threadId="t1" />);
		expect(screen.getByTestId("tree")).toBeInTheDocument();
		unmount();

		useGitStatusMock.mockReturnValue(status([]));
		render(<DiffTab threadId="t1" />);
		expect(screen.getByText("No changes in working tree.")).toBeInTheDocument();
	});

	test("decorates file rows with only the line counts that changed", () => {
		useGitStatusMock.mockReturnValue(status(FILES));
		render(<DiffTab threadId="t1" />);
		const decorate = (path: string, kind: "file" | "directory" = "file") =>
			treeOptions.renderRowDecoration?.({ item: { path }, row: { kind } });

		expect(decorate("src/a.ts")?.text).toBe("+3\u00a0-2");
		expect(decorate("src/new.ts")?.text).toBe("+4");
		expect(decorate("old.md")?.text).toBe("-5");
		expect(decorate("same.ts")).toBeNull();
		expect(decorate("src", "directory")).toBeNull();
	});

	test("opens the diff for a selected file and returns to the tree", async () => {
		useGitStatusMock.mockReturnValue(status(FILES));
		render(<DiffTab threadId="t1" />);

		act(() => treeOptions.onSelectionChange?.(["src/a.ts"]));
		expect(useGitPatchMock).toHaveBeenLastCalledWith("t1", "src/a.ts", true);
		expect(screen.getByTestId("patch")).toHaveTextContent("diff --git");
		expect(screen.getByText("src/a.ts")).toBeInTheDocument();

		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Back to changes" }));
		expect(deselect).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId("patch")).not.toBeInTheDocument();
	});

	test("ignores a selected folder", () => {
		useGitStatusMock.mockReturnValue(status(FILES));
		render(<DiffTab threadId="t1" />);

		act(() => treeOptions.onSelectionChange?.(["src/"]));
		expect(
			screen.queryByRole("button", { name: "Back to changes" })
		).not.toBeInTheDocument();
	});

	test("closes the diff when the file is no longer changed", () => {
		useGitStatusMock.mockReturnValue(status(FILES));
		const { rerender } = render(<DiffTab threadId="t1" />);
		act(() => treeOptions.onSelectionChange?.(["src/a.ts"]));
		expect(screen.getByTestId("patch")).toBeInTheDocument();

		useGitStatusMock.mockReturnValue(status([FILES[1]]));
		rerender(<DiffTab threadId="t1" />);
		expect(screen.queryByTestId("patch")).not.toBeInTheDocument();
	});
});
