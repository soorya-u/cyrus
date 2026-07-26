import { expect } from "@playwright/test";
import { test } from "../fixtures";
import { openConnectedController } from "../helpers";

const e2eDescribe =
	process.env.NODE_ENV === "testing" ? test.describe : test.describe.skip;

e2eDescribe("thread metadata sync", () => {
	test("controller sees worker metadata after hub join", async ({
		page,
		context,
		auth,
		cliWorker,
	}) => {
		await openConnectedController(page, context, auth, cliWorker.name);
		await expect(page.getByRole("combobox")).toContainText(cliWorker.name);
	});
});
