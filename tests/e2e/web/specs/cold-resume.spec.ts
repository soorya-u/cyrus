import { expect } from "@playwright/test";
import { test } from "../fixtures";
import {
	addProject,
	expectThreadCount,
	installSessionCookie,
	openConnectedController,
	openNewDraft,
	projectNameFor,
	selectDraftAgent,
	sendComposerMessage,
	THREAD_ROUTE,
} from "../helpers";

const e2eDescribe =
	process.env.NODE_ENV === "testing" ? test.describe : test.describe.skip;

e2eDescribe("cold session resume", () => {
	test("thread resumes with the same session after a worker restart", async ({
		page,
		context,
		auth,
		cliWorker,
	}) => {
		const projectName = projectNameFor("cold-resume");
		await openConnectedController(page, context, auth, cliWorker.name);
		await addProject(page, projectName);
		await openNewDraft(page, projectName);
		await selectDraftAgent(page);
		await sendComposerMessage(page, "cold resume ping");
		await expect(page).toHaveURL(THREAD_ROUTE, { timeout: 90_000 });
		await expectThreadCount(page, projectName, 1);
		const threadUrl = page.url();

		await cliWorker.restart();

		await installSessionCookie(context, auth);
		await page.goto(threadUrl);
		await expect(page.getByRole("combobox")).toBeVisible({ timeout: 30_000 });

		const combobox = page.getByRole("combobox");
		if (!(await combobox.innerText()).includes(cliWorker.name)) {
			await combobox.click();
			await page.getByRole("option", { name: cliWorker.name }).click();
			await page.goto(threadUrl);
		}

		await expect(page.locator('[data-chat-composer-form="true"]')).toBeVisible({
			timeout: 60_000,
		});
		await sendComposerMessage(page, "after restart");
		await expectThreadCount(page, projectName, 1);
		await expect(page).toHaveURL(threadUrl);
	});
});
