import type { Thread } from "@cyrus/schemas/rtc/threads";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, type Mock, test, vi } from "vitest";
import { ThreadRow } from "./thread-row";

const thread: Thread = {
	id: "thread-1",
	projectId: "project-1",
	name: "Fix login bug",
	agentName: undefined,
	sessionId: undefined,
	agentLocked: undefined,
	titleSource: null,
	branch: null,
	worktreePath: null,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

describe.each(["sub", "list"] as const)("ThreadRow (%s variant)", (variant) => {
	let onSelect: Mock<(id: string) => void>;
	let onDelete: Mock<(id: string) => void>;
	let onRename: Mock<(id: string, name: string) => void>;

	beforeEach(() => {
		onSelect = vi.fn<(id: string) => void>();
		onDelete = vi.fn<(id: string) => void>();
		onRename = vi.fn<(id: string, name: string) => void>();
	});

	function renderRow() {
		return render(
			<ThreadRow
				isActive={false}
				onDelete={onDelete}
				onRename={onRename}
				onSelect={onSelect}
				thread={thread}
				variant={variant}
			/>
		);
	}

	test("clicking the row selects the thread", async () => {
		const user = userEvent.setup();
		renderRow();

		await user.click(screen.getByText("Fix login bug"));

		expect(onSelect).toHaveBeenCalledWith("thread-1");
	});

	test("double-click starts a rename, and Enter commits it", async () => {
		const user = userEvent.setup();
		renderRow();

		await user.dblClick(screen.getByText("Fix login bug"));

		const input = screen.getByDisplayValue("Fix login bug");
		await user.clear(input);
		await user.type(input, "Renamed thread{Enter}");

		expect(onRename).toHaveBeenCalledWith("thread-1", "Renamed thread");
		expect(
			screen.queryByDisplayValue("Renamed thread")
		).not.toBeInTheDocument();
	});

	test("Escape cancels a rename without calling onRename", async () => {
		const user = userEvent.setup();
		renderRow();

		await user.dblClick(screen.getByText("Fix login bug"));
		const input = screen.getByDisplayValue("Fix login bug");
		await user.type(input, "{Escape}");

		expect(onRename).not.toHaveBeenCalled();
		expect(screen.getByText("Fix login bug")).toBeInTheDocument();
	});

	test("blurring the rename input commits the draft", async () => {
		const user = userEvent.setup();
		renderRow();

		await user.dblClick(screen.getByText("Fix login bug"));
		const input = screen.getByDisplayValue("Fix login bug");
		await user.clear(input);
		await user.type(input, "Blurred rename");
		await user.tab();

		expect(onRename).toHaveBeenCalledWith("thread-1", "Blurred rename");
	});

	test("delete requires confirmation before onDelete fires", async () => {
		const user = userEvent.setup();
		renderRow();

		await user.click(screen.getByLabelText("Delete Fix login bug"));

		expect(onDelete).not.toHaveBeenCalled();
		expect(screen.getByText("Confirm")).toBeInTheDocument();

		await user.click(screen.getByText("Confirm"));

		expect(onDelete).toHaveBeenCalledWith("thread-1");
	});

	test("cancelling the delete confirmation restores the delete button without calling onDelete", async () => {
		const user = userEvent.setup();
		renderRow();

		await user.click(screen.getByLabelText("Delete Fix login bug"));
		expect(screen.getByText("Confirm")).toBeInTheDocument();

		await user.click(screen.getByText("Cancel"));

		expect(onDelete).not.toHaveBeenCalled();
		expect(screen.getByLabelText("Delete Fix login bug")).toBeInTheDocument();
		expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
	});
});
