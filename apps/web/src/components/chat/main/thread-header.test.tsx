import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useChatUiStore } from "@/stores/chat-ui";
import { ThreadHeader } from "./thread-header";

const useGitStatusMock = vi.fn();

vi.mock("@cyrus/hooks/queries/use-git", () => ({
	useGitStatus: (arg: unknown) => useGitStatusMock(arg),
	useInitGitRepository: () => ({
		mutate: vi.fn(),
		reset: vi.fn(),
		isPending: false,
		error: null,
	}),
}));

vi.mock("@cyrus/hooks/queries/use-projects", () => ({
	useProjects: () => ({ projects: [{ id: "p1", name: "Proj" }] }),
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => (
		<a href="/">{children}</a>
	),
}));

const props = {
	title: "Thread",
	workerId: "w1",
	projectId: "p1",
	threadId: "t1",
};

beforeEach(() => {
	vi.clearAllMocks();
	useChatUiStore.setState({ drawerOpen: false });
});

describe("ThreadHeader workspace button", () => {
	test("toggles the workspace drawer from an icon button in a git repo", async () => {
		useGitStatusMock.mockReturnValue({ data: { isRepo: true } });
		render(<ThreadHeader {...props} />);

		const button = screen.getByRole("button", {
			name: "Toggle workspace drawer",
		});
		expect(button).toHaveAttribute("aria-pressed", "false");

		await userEvent.setup().click(button);
		expect(useChatUiStore.getState().drawerOpen).toBe(true);
		expect(button).toHaveAttribute("aria-pressed", "true");
	});

	test("offers Initialize Git instead when the directory is not a repo", () => {
		useGitStatusMock.mockReturnValue({ data: { isRepo: false } });
		render(<ThreadHeader {...props} />);

		expect(
			screen.getByRole("button", { name: "Initialize Git" })
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Toggle workspace drawer" })
		).not.toBeInTheDocument();
	});

	test("shows no workspace control for a local draft", () => {
		useGitStatusMock.mockReturnValue({ data: undefined });
		render(<ThreadHeader {...props} localDraft threadId={undefined} />);

		expect(
			screen.queryByRole("button", { name: "Toggle workspace drawer" })
		).not.toBeInTheDocument();
	});
});
