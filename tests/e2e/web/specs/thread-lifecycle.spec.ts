import { expect } from "@playwright/test";
import { test } from "../fixtures";
import {
	addProject,
	expectThreadCount,
	openConnectedController,
	openNewDraft,
	projectNameFor,
	selectDraftAgent,
	sendComposerMessage,
	THREAD_ROUTE,
} from "../helpers";

const e2eDescribe =
	process.env.NODE_ENV === "testing" ? test.describe : test.describe.skip;

e2eDescribe("thread lifecycle", () => {
	test("drafts leave no worker state; startThread births exactly one thread", async ({
		page,
		context,
		auth,
		cliWorker,
	}) => {
		const projectName = projectNameFor("lifecycle");
		await openConnectedController(page, context, auth, cliWorker.name);
		await addProject(page, projectName);
		await expectThreadCount(page, projectName, 0);

		await openNewDraft(page, projectName);
		await selectDraftAgent(page);
		await expectThreadCount(page, projectName, 0);

		await sendComposerMessage(page, "hello lifecycle");
		await expectThreadCount(page, projectName, 1);
		await expect(page).toHaveURL(THREAD_ROUTE, { timeout: 60_000 });
	});
});
