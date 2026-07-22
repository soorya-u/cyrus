import { expect } from "@playwright/test";
import { test } from "../fixtures";

const e2eDescribe =
	process.env.NODE_ENV === "testing" ? test.describe : test.describe.skip;

e2eDescribe("web smoke", () => {
	test("authenticated workspace shows the connected worker", async ({
		page,
		context,
		auth,
		cliWorker,
	}) => {
		await context.addCookies([
			{
				name: "better-auth.session_token",
				value: auth.sessionToken,
				domain: "localhost",
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
			page.getByRole("option", { name: cliWorker.name })
		).toBeVisible({
			timeout: 30_000,
		});
	});
});
