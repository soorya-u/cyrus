import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { WorkspaceDrawerSheet } from "./workspace-drawer-sheet";

describe("WorkspaceDrawerSheet", () => {
	test("renders its content as a dialog when open", () => {
		render(
			<WorkspaceDrawerSheet onOpenChange={vi.fn()} open>
				<div>drawer body</div>
			</WorkspaceDrawerSheet>
		);

		expect(screen.getByRole("dialog", { name: "Workspace" })).toBeVisible();
		expect(screen.getByText("drawer body")).toBeInTheDocument();
	});

	test("renders nothing when closed", () => {
		render(
			<WorkspaceDrawerSheet onOpenChange={vi.fn()} open={false}>
				<div>drawer body</div>
			</WorkspaceDrawerSheet>
		);

		expect(screen.queryByText("drawer body")).not.toBeInTheDocument();
	});

	test("requests close on Escape", async () => {
		const onOpenChange = vi.fn();
		const user = userEvent.setup();
		render(
			<WorkspaceDrawerSheet onOpenChange={onOpenChange} open>
				<div>drawer body</div>
			</WorkspaceDrawerSheet>
		);

		await user.keyboard("{Escape}");

		expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
	});
});
