import { SignalingConnectionContext } from "@cyrus/providers/signaling/signaling-context";
import type { SignalingConnection } from "@cyrus/providers/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { useSignaling } from "./signaling";

const connection = {
	session: { close: () => undefined },
	orpc: {},
} as SignalingConnection;

function SignalingProbe() {
	const value = useSignaling();
	const [label, setLabel] = useState("idle");

	return (
		<button
			onClick={() => {
				setLabel(value === connection ? "connected" : "mismatch");
			}}
			type="button"
		>
			{label}
		</button>
	);
}

describe("useSignaling", () => {
	test("exposes the signaling connection from context on interaction", async () => {
		const user = userEvent.setup();

		render(
			<SignalingConnectionContext.Provider value={connection}>
				<SignalingProbe />
			</SignalingConnectionContext.Provider>
		);

		const button = screen.getByRole("button", { name: "idle" });
		await user.click(button);
		expect(
			screen.getByRole("button", { name: "connected" })
		).toBeInTheDocument();
	});
});
