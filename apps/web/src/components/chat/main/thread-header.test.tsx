import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useChatUiStore } from "@/stores/chat-ui";
import { ThreadHeader } from "./thread-header";

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
	test("toggles the workspace drawer from an icon button", async () => {
		render(<ThreadHeader {...props} />);

		const button = screen.getByRole("button", {
			name: "Toggle workspace drawer",
		});
		expect(button).toHaveAttribute("aria-pressed", "false");

		await userEvent.setup().click(button);
		expect(useChatUiStore.getState().drawerOpen).toBe(true);
		expect(button).toHaveAttribute("aria-pressed", "true");
	});

	test("shows no workspace control for a local draft", () => {
		render(<ThreadHeader {...props} localDraft threadId={undefined} />);

		expect(
			screen.queryByRole("button", { name: "Toggle workspace drawer" })
		).not.toBeInTheDocument();
	});
});
