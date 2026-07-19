import { useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { QueryProvider } from "./query-provider";

function Probe() {
	const [enabled, setEnabled] = useState(false);
	const query = useQuery({
		queryKey: ["vitest-jsdom-probe"],
		queryFn: async () => "ready",
		enabled,
	});

	return (
		<div>
			<button onClick={() => setEnabled(true)} type="button">
				Load
			</button>
			<p>{query.data ?? "idle"}</p>
		</div>
	);
}

describe("QueryProvider", () => {
	test("provides a query client that descendants can use after interaction", async () => {
		const user = userEvent.setup();

		render(
			<QueryProvider>
				<Probe />
			</QueryProvider>
		);

		expect(screen.getByText("idle")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Load" }));
		expect(await screen.findByText("ready")).toBeInTheDocument();
	});
});
