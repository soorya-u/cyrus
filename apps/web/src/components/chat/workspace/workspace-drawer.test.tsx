import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useChatUiStore } from "@/stores/chat-ui";
import { WorkspaceDrawer } from "./workspace-drawer";

const useGitStatusMock = vi.fn();
const useGitPatchMock = vi.fn();

vi.mock("@cyrus/hooks/queries/use-git", () => ({
	useGitStatus: (arg: unknown) => useGitStatusMock(arg),
	useGitPatch: (...args: unknown[]) => useGitPatchMock(...args),
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
	useChatUiStore.setState({ workspaceTab: "explorer" });
});

describe("WorkspaceDrawer", () => {
	test("defaults to the explorer tab", () => {
		render(<WorkspaceDrawer onClose={vi.fn()} threadId="thread-1" />);

		expect(screen.getByText("File browsing coming soon.")).toBeInTheDocument();
	});

	test("switches to the diff tab and back via the toggle group", async () => {
		const user = userEvent.setup();
		render(<WorkspaceDrawer onClose={vi.fn()} threadId="thread-1" />);

		await user.click(screen.getByRole("radio", { name: "Diff" }));
		expect(useChatUiStore.getState().workspaceTab).toBe("diff");
		expect(screen.getByText("main")).toBeInTheDocument();

		await user.click(screen.getByRole("radio", { name: "Explorer" }));
		expect(useChatUiStore.getState().workspaceTab).toBe("explorer");
		expect(screen.getByText("File browsing coming soon.")).toBeInTheDocument();
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
});
