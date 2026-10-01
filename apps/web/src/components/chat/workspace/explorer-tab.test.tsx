import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ExplorerTab } from "./explorer-tab";

type TreeOptions = { onSelectionChange?: (paths: readonly string[]) => void };

let treeOptions: TreeOptions = {};
const deselect = vi.fn();
const model = {
	resetPaths: vi.fn(),
	batch: vi.fn(),
	setGitStatus: vi.fn(),
	subscribe: vi.fn(() => () => undefined),
	getItem: vi.fn(() => ({ deselect, isDirectory: () => false })),
};

vi.mock("@pierre/trees/react", () => ({
	useFileTree: (options: TreeOptions) => {
		treeOptions = options;
		return { model };
	},
	FileTree: () => <div data-testid="tree" />,
}));

vi.mock("@cyrus/hooks/queries/use-git", () => ({
	useGitStatus: () => ({ data: { isRepo: true, files: [] }, dataUpdatedAt: 1 }),
	useGitFile: () => ({
		isLoading: false,
		isError: false,
		data: { kind: "text", contents: "hello" },
	}),
}));

vi.mock("@/components/chat/workspace/use-directory-entries", () => ({
	useDirectoryEntries: () => ({
		entries: [],
		load: vi.fn(),
		refresh: vi.fn(),
		ready: true,
		error: null,
	}),
}));

vi.mock("@pierre/diffs/react", () => ({
	File: ({ file }: { file: { contents: string } }) => (
		<pre>{file.contents}</pre>
	),
}));

beforeEach(() => vi.clearAllMocks());

describe("ExplorerTab", () => {
	test("opens a preview when a file is selected and returns to the tree", async () => {
		render(<ExplorerTab threadId="t1" />);

		act(() => treeOptions.onSelectionChange?.(["src/a.ts"]));
		expect(screen.getByText("src/a.ts")).toBeInTheDocument();
		expect(screen.getByText("hello")).toBeInTheDocument();

		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Back to files" }));
		expect(deselect).toHaveBeenCalledTimes(1);
		expect(screen.queryByText("hello")).not.toBeInTheDocument();
	});

	test("does not open a preview for a selected folder", () => {
		render(<ExplorerTab threadId="t1" />);

		act(() => treeOptions.onSelectionChange?.(["src/"]));
		expect(
			screen.queryByRole("button", { name: "Back to files" })
		).not.toBeInTheDocument();
	});

	test("shows the load error instead of an empty tree when the root fails", async () => {
		vi.resetModules();
		vi.doMock("@/components/chat/workspace/use-directory-entries", () => ({
			useDirectoryEntries: () => ({
				entries: [],
				load: vi.fn(),
				refresh: vi.fn(),
				ready: false,
				error: "Not a git repository",
			}),
		}));
		const { ExplorerTab: Failing } = await import("./explorer-tab");
		render(<Failing threadId="t1" />);

		expect(screen.getByText("Not a git repository")).toBeInTheDocument();
	});
});
