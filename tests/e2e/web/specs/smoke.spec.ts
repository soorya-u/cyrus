import { expect, test } from "@playwright/test";
import { loadPlaywrightState } from "../state";

const e2eTest = process.env.CYRUS_E2E === "1" ? test : test.skip;

e2eTest.describe("web smoke", () => {
	e2eTest(
		"authenticated workspace shows the connected worker",
		async ({ page, context }) => {
			const state = await loadPlaywrightState();
			await context.addCookies([
				{
					name: "better-auth.session_token",
					value: state.sessionCookie,
					domain: "127.0.0.1",
					path: "/",
				},
			]);

			await page.goto("/workers");
			await expect(page.getByText(state.workerName)).toBeVisible({
				timeout: 30_000,
			});
		}
	);
});
