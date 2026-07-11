import { writeFile } from "node:fs/promises";
import { requireE2e } from "../harness/env";
import { startE2eStack, stopE2eStack } from "../harness/stack";
import { type PlaywrightState, playwrightStatePath } from "./state";

if (import.meta.main) {
	requireE2e();
	const stack = await startE2eStack();
	const sessionValue = stack.auth.sessionCookie.split("=")[1] ?? "";

	await writeFile(
		playwrightStatePath(),
		JSON.stringify({
			webUrl: "http://127.0.0.1:5173",
			serverUrl: "http://127.0.0.1:8787",
			sessionCookie: sessionValue,
			workerName: "E2E Worker",
		} satisfies PlaywrightState),
		"utf8"
	);

	process.on("SIGINT", () => {
		stopE2eStack(stack).finally(() => process.exit(0));
	});
	process.on("SIGTERM", () => {
		stopE2eStack(stack).finally(() => process.exit(0));
	});

	// Keep the stack alive for Playwright.
	await new Promise(() => {
		// intentional indefinite wait while Playwright runs
	});
}
