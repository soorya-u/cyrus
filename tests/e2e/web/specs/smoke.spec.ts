import { expect, test } from "@playwright/test";
import { loadPlaywrightState } from "../state";

const e2eDescribe =
	process.env.CYRUS_E2E === "1" ? test.describe : test.describe.skip;

e2eDescribe("web smoke", () => {
	test("authenticated workspace shows the connected worker", async ({
		page,
		context,
	}) => {
		const state = await loadPlaywrightState();
		await context.addCookies([
			{
				name: "better-auth.session_token",
				value: state.sessionCookie,
				domain: "127.0.0.1",
				path: "/",
				httpOnly: true,
				secure: false,
				sameSite: "Lax",
			},
		]);

		await page.goto("/workers");
		await expect(page.getByRole("combobox")).toBeVisible({
			timeout: 30_000,
		});
		await page.getByRole("combobox").click();
		await expect(
			page.getByRole("option", { name: state.workerName })
		).toBeVisible({
			timeout: 30_000,
		});
	});
});
