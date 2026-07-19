import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { Button } from "./button";

describe("Button", () => {
	test("renders and handles click interactions", async () => {
		const user = userEvent.setup();
		let clicked = false;

		render(
			<Button
				onClick={() => {
					clicked = true;
				}}
			>
				Save
			</Button>
		);

		const button = screen.getByRole("button", { name: "Save" });
		expect(button).toBeInTheDocument();

		await user.click(button);
		expect(clicked).toBe(true);
	});
});
