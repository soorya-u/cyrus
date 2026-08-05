import type { DiffView, ToolCallView } from "@cyrus/schemas/view";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { ToolRow } from "./tool-row";

const diff: DiffView = {
	id: "tool-1:a.ts",
	path: "a.ts",
	patch: "--- a/a.ts\n+++ b/a.ts\n@@ -0,0 +1 @@\n+a\n",
	additions: 1,
	deletions: 0,
	turnId: "turn-1",
	toolCallId: "tool-1",
};

const tool: ToolCallView = {
	toolCallId: "tool-1",
	title: "Edit a.ts",
	status: "completed",
	createdAt: "2026-01-01T00:00:00.000Z",
	turnId: "turn-1",
	diffs: [diff],
	seq: 1,
};

describe("ToolRow", () => {
	test("opening a nested diff does not close the parent tool row", async () => {
		const user = userEvent.setup();
		render(<ToolRow tool={tool} />);

		await user.click(screen.getByText("Edit a.ts"));
		expect(screen.getByText("a.ts")).toBeInTheDocument();

		await user.click(screen.getByText("a.ts"));

		expect(screen.getByText("a.ts")).toBeInTheDocument();
	});

	test("clicking inside an open diff body does not close the parent tool row", async () => {
		const user = userEvent.setup();
		render(<ToolRow tool={tool} />);

		await user.click(screen.getByText("Edit a.ts"));
		await user.click(screen.getByText("a.ts"));

		const diffBody = document.querySelector(".diff-render-surface");
		expect(diffBody).not.toBeNull();
		if (diffBody) await user.click(diffBody);

		expect(screen.getByText("a.ts")).toBeInTheDocument();
	});
});
