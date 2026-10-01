import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DiffTab } from "./diff-tab";

const MODIFIED_HEADER = /^M\s*a\.ts\s*src\s*\+3 -2$/;
const UNTRACKED_HEADER = /^U\s*new\.ts\s*src\s*\+4$/;
const DELETED_HEADER = /^D\s*old\.md\s*-5$/;
const A_TS_HEADER = /a\.ts/;
const ANY_TS_HEADER = /\.ts/;

const observed = new Set<{ element: Element; notify: () => void }>();
let autoIntersect = true;

class FakeIntersectionObserver {
	private readonly callback: IntersectionObserverCallback;
	private readonly entries = new Set<{
		element: Element;
		notify: () => void;
	}>();

	constructor(callback: IntersectionObserverCallback) {
		this.callback = callback;
	}

	observe(element: Element) {
		const entry = {
			element,
			notify: () =>
				this.callback(
					[
						{
							isIntersecting: true,
							target: element,
						} as IntersectionObserverEntry,
					],
					this as unknown as IntersectionObserver
				),
		};
		this.entries.add(entry);
		observed.add(entry);
		if (autoIntersect) entry.notify();
	}

	disconnect() {
		for (const entry of this.entries) observed.delete(entry);
		this.entries.clear();
	}

	unobserve() {
		// not needed: the fake only tracks observe/disconnect
	}
	takeRecords() {
		return [];
	}
}

const useGitStatusMock = vi.fn();
const useGitPatchMock = vi.fn();

vi.mock("@pierre/diffs/react", () => ({
	PatchDiff: ({ patch }: { patch: string }) => (
		<pre data-testid="patch">{patch}</pre>
	),
}));

vi.mock("@cyrus/hooks/queries/use-git", () => ({
	useGitStatus: () => useGitStatusMock(),
	useGitPatch: (...args: unknown[]) => useGitPatchMock(...args),
}));

function change(
	path: string,
	status: string,
	insertions: number,
	deletions: number
) {
	return { path, status, insertions, deletions };
}

function patchFor(path: string, body = "-a\n+b\n") {
	return `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -1 +1 @@\n${body}`;
}

function setup(files: ReturnType<typeof change>[], patch: string) {
	useGitStatusMock.mockReturnValue({
		data: {
			isRepo: true,
			refName: "main",
			files,
			insertions: files.reduce((n, f) => n + f.insertions, 0),
			deletions: files.reduce((n, f) => n + f.deletions, 0),
		},
		isLoading: false,
		isFetching: false,
		refetch: vi.fn(),
	});
	useGitPatchMock.mockReturnValue({
		data: { patch },
		isLoading: false,
		isFetching: false,
		refetch: vi.fn(),
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	observed.clear();
	autoIntersect = true;
	vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
});

describe("DiffTab (uncommitted changes)", () => {
	test("requests one patch for the whole working tree", () => {
		setup([change("a.ts", "Modified", 1, 1)], patchFor("a.ts"));
		render(<DiffTab threadId="t1" />);

		expect(useGitPatchMock).toHaveBeenCalledWith("t1", undefined);
	});

	test("shows every changed file with its own diff and only the changed counts", () => {
		setup(
			[
				change("src/a.ts", "Modified", 3, 2),
				change("src/new.ts", "Untracked", 4, 0),
				change("old.md", "Deleted", 0, 5),
			],
			patchFor("src/a.ts", "-x\n+y\n") +
				patchFor("src/new.ts", "+n\n") +
				patchFor("old.md", "-o\n")
		);
		render(<DiffTab threadId="t1" />);

		expect(
			screen.getByRole("button", { name: MODIFIED_HEADER })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: UNTRACKED_HEADER })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: DELETED_HEADER })
		).toBeInTheDocument();

		const patches = screen
			.getAllByTestId("patch")
			.map((node) => node.textContent);
		expect(patches).toHaveLength(3);
		expect(patches[0]).toContain("+++ b/src/a.ts");
		expect(patches[1]).toContain("+++ b/src/new.ts");
		expect(patches[2]).toContain("+++ b/old.md");
	});

	test("collapses and expands a single file from its header", async () => {
		setup(
			[change("a.ts", "Modified", 1, 1), change("b.ts", "Modified", 1, 1)],
			patchFor("a.ts") + patchFor("b.ts")
		);
		render(<DiffTab threadId="t1" />);
		const user = userEvent.setup();

		const header = screen.getByRole("button", { name: A_TS_HEADER });
		expect(header).toHaveAttribute("aria-expanded", "true");
		await user.click(header);
		expect(header).toHaveAttribute("aria-expanded", "false");
		expect(screen.getAllByTestId("patch")).toHaveLength(1);

		await user.click(header);
		expect(screen.getAllByTestId("patch")).toHaveLength(2);
	});

	test("collapses and expands every file at once", async () => {
		setup(
			[change("a.ts", "Modified", 1, 1), change("b.ts", "Modified", 1, 1)],
			patchFor("a.ts") + patchFor("b.ts")
		);
		render(<DiffTab threadId="t1" />);
		const user = userEvent.setup();

		await user.click(
			screen.getByRole("button", { name: "Collapse all files" })
		);
		expect(screen.queryAllByTestId("patch")).toHaveLength(0);

		await user.click(screen.getByRole("button", { name: "Expand all files" }));
		expect(screen.getAllByTestId("patch")).toHaveLength(2);
	});

	test("starts with every file expanded, however many changed", () => {
		const files = Array.from({ length: 12 }, (_, i) =>
			change(`f${i}.ts`, "Modified", 1, 1)
		);
		setup(files, files.map((f) => patchFor(f.path)).join(""));
		render(<DiffTab threadId="t1" />);

		expect(
			screen.getAllByRole("button", { name: ANY_TS_HEADER })[0]
		).toHaveAttribute("aria-expanded", "true");
		expect(screen.getAllByTestId("patch")).toHaveLength(12);
	});

	test("only mounts a file's diff once it is near the viewport", () => {
		autoIntersect = false;
		const files = [
			change("a.ts", "Modified", 1, 1),
			change("b.ts", "Modified", 1, 1),
		];
		setup(files, patchFor("a.ts") + patchFor("b.ts"));
		render(<DiffTab threadId="t1" />);

		expect(screen.queryAllByTestId("patch")).toHaveLength(0);

		act(() => [...observed][0]?.notify());
		expect(screen.getAllByTestId("patch")).toHaveLength(1);
		expect(screen.getByTestId("patch")).toHaveTextContent("+++ b/a.ts");
	});

	test("explains files without a text diff", () => {
		setup(
			[change("blob.bin", "Modified", 0, 0)],
			"diff --git a/blob.bin b/blob.bin\nBinary files a/blob.bin and b/blob.bin differ\n"
		);
		render(<DiffTab threadId="t1" />);

		expect(screen.getByText("Binary file — no text diff.")).toBeInTheDocument();
	});

	test("shows a message when nothing changed", () => {
		setup([], "");
		render(<DiffTab threadId="t1" />);

		expect(screen.getByText("No changes in working tree.")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Collapse all files" })
		).not.toBeInTheDocument();
	});
});
