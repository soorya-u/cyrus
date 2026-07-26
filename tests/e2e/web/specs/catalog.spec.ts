import { expect } from "@playwright/test";
import { test } from "../fixtures";
import {
	addProject,
	openConnectedController,
	openNewDraft,
	projectNameFor,
	selectDraftAgent,
	sendComposerMessage,
	THREAD_ROUTE,
} from "../helpers";

const e2eDescribe =
	process.env.NODE_ENV === "testing" ? test.describe : test.describe.skip;

const NON_EMPTY = /./;

e2eDescribe("catalog", () => {
	test("controller gets and sets a bound thread catalog", async ({
		page,
		context,
		auth,
		cliWorker,
	}) => {
		const projectName = projectNameFor("catalog");
		await openConnectedController(page, context, auth, cliWorker.name);
		await addProject(page, projectName);
		await openNewDraft(page, projectName);
		await selectDraftAgent(page);

		await sendComposerMessage(page, "catalog verify");
		await expect(page).toHaveURL(THREAD_ROUTE, { timeout: 90_000 });

		const footer = page.locator('[data-chat-composer-footer="true"]');
		await expect(footer).toBeVisible({ timeout: 30_000 });

		const modelTrigger = footer.getByRole("button").first();
		await expect(modelTrigger).toBeEnabled({ timeout: 60_000 });
		await modelTrigger.click();
		const modelOptions = page.locator(
			'[role="menu"] button, [data-slot="dropdown-menu-content"] button'
		);
		await expect(modelOptions.first()).toBeVisible({ timeout: 30_000 });
		const modelCount = await modelOptions.count();
		expect(modelCount).toBeGreaterThan(0);
		await page.keyboard.press("Escape");

		const modeTrigger = footer
			.getByRole("combobox")
			.filter({ hasText: NON_EMPTY })
			.first();
		if (await modeTrigger.isVisible().catch(() => false)) {
			await modeTrigger.click();
			const modeOption = page.getByRole("option").first();
			await expect(modeOption).toBeVisible({ timeout: 15_000 });
			const modeName = (await modeOption.innerText()).trim();
			await modeOption.click();
			await expect(modeTrigger).toContainText(modeName, { timeout: 15_000 });
		}
	});
});
