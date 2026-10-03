import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useChatUiStore } from "@/stores/chat-ui";
import { WorkspaceDrawer } from "./workspace-drawer";

const useGitStatusMock = vi.fn();
const useGitPatchMock = vi.fn();
const initMutate = vi.fn();
const initGitRepositoryState = {
	isPending: false,
	error: null as Error | null,
};

vi.mock("@cyrus/hooks/queries/use-git", () => ({
	useGitStatus: (arg: unknown) => useGitStatusMock(arg),
	useGitPatch: (...args: unknown[]) => useGitPatchMock(...args),
	useInitGitRepository: () => ({
		mutate: initMutate,
		reset: vi.fn(),
		...initGitRepositoryState,
	}),
}));

vi.mock("@pierre/trees/react", () => ({
	useFileTree: () => ({
		model: {
			resetPaths: vi.fn(),
			batch: vi.fn(),
			setGitStatus: vi.fn(),
			getItem: vi.fn(),
		},
	}),
	FileTree: () => <div />,
}));

vi.mock("@/components/chat/workspace/explorer-tab", () => ({
	ExplorerTab: ({ threadId }: { threadId: string }) => (
		<div>explorer for {threadId}</div>
	),
}));

beforeEach(() => {
	vi.clearAllMocks();
	useGitStatusMock.mockReturnValue({
		data: {
			isRepo: true,
			refName: "main",
			files: [],
			insertions: 0,
			deletions: 0,
		},
		isLoading: false,
		isFetching: false,
		refetch: vi.fn(),
	});
	useGitPatchMock.mockReturnValue({ data: undefined, isLoading: false });
	initGitRepositoryState.isPending = false;
	initGitRepositoryState.error = null;
	useChatUiStore.setState({ workspaceTab: "explorer" });
});

describe("WorkspaceDrawer", () => {
	test("defaults to the explorer tab", () => {
		render(<WorkspaceDrawer onClose={vi.fn()} threadId="thread-1" />);

		expect(screen.getByText("explorer for thread-1")).toBeInTheDocument();
	});

	test("switches to the diff tab and back via the toggle group", async () => {
		const user = userEvent.setup();
		render(<WorkspaceDrawer onClose={vi.fn()} threadId="thread-1" />);

		await user.click(screen.getByRole("radio", { name: "Diff" }));
		expect(useChatUiStore.getState().workspaceTab).toBe("diff");
		expect(screen.getByText("main")).toBeInTheDocument();

		await user.click(screen.getByRole("radio", { name: "Explorer" }));
		expect(useChatUiStore.getState().workspaceTab).toBe("explorer");
		expect(screen.getByText("explorer for thread-1")).toBeInTheDocument();
	});

	test("only one tab is ever selected — clicking the active tab again is a no-op", async () => {
		const user = userEvent.setup();
		render(<WorkspaceDrawer onClose={vi.fn()} threadId="thread-1" />);

		await user.click(screen.getByRole("radio", { name: "Explorer" }));
		expect(useChatUiStore.getState().workspaceTab).toBe("explorer");
	});

	test("calls onClose when the close control is clicked", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(<WorkspaceDrawer onClose={onClose} threadId="thread-1" />);

		await user.click(
			screen.getByRole("button", { name: "Close workspace drawer" })
		);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	test("has no close control without onClose", () => {
		render(<WorkspaceDrawer threadId="thread-1" />);

		expect(
			screen.queryByRole("button", { name: "Close workspace drawer" })
		).not.toBeInTheDocument();
	});

	describe("without a git repository", () => {
		beforeEach(() => {
			useGitStatusMock.mockReturnValue({
				data: { isRepo: false },
				isLoading: false,
				isFetching: false,
				refetch: vi.fn(),
			});
		});

		test("hides the Diff tab and offers Initialize Git instead", () => {
			render(<WorkspaceDrawer onClose={vi.fn()} threadId="thread-1" />);

			expect(screen.getByText("explorer for thread-1")).toBeInTheDocument();
			expect(
				screen.queryByRole("radio", { name: "Diff" })
			).not.toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Initialize Git" })
			).toBeInTheDocument();
		});

		test("falls back to the Explorer when the remembered tab is Diff", () => {
			useChatUiStore.setState({ workspaceTab: "diff" });
			render(<WorkspaceDrawer onClose={vi.fn()} threadId="thread-1" />);

			expect(screen.getByText("explorer for thread-1")).toBeInTheDocument();
		});

		test("initializes the repository for the thread", async () => {
			const user = userEvent.setup();
			render(<WorkspaceDrawer onClose={vi.fn()} threadId="thread-1" />);

			await user.click(screen.getByRole("button", { name: "Initialize Git" }));
			expect(initMutate).toHaveBeenCalledWith({ threadId: "thread-1" });
		});

		test("disables the button while initializing", () => {
			initGitRepositoryState.isPending = true;
			render(<WorkspaceDrawer onClose={vi.fn()} threadId="thread-1" />);

			expect(
				screen.getByRole("button", { name: "Initializing..." })
			).toBeDisabled();
		});
	});

	test("shows the Diff tab and no Initialize Git button in a repository", () => {
		render(<WorkspaceDrawer onClose={vi.fn()} threadId="thread-1" />);

		expect(screen.getByRole("radio", { name: "Diff" })).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Initialize Git" })
		).not.toBeInTheDocument();
	});
});
