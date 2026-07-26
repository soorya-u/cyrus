import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type BrowserContext, expect, type Page } from "@playwright/test";
import type { AuthFixture } from "./fixtures";

const ADD_PROJECT_SUBMIT_NAME = /Add|Create & Add/;
const CLAUDE_AGENT_NAME = /Claude Agent|claude/i;
const AGENT_PLACEHOLDER = /^Agent$/;
const MODEL_MENU =
	'[data-slot="dropdown-menu-content"] button, [role="menu"] button';

export const THREAD_ROUTE = /\/t\/[^/]+/;

export function projectNameFor(scenario: string): string {
	return `e2e-${scenario}`;
}

export async function installSessionCookie(
	context: BrowserContext,
	auth: AuthFixture
): Promise<void> {
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
}

export async function openConnectedController(
	page: Page,
	context: BrowserContext,
	auth: AuthFixture,
	workerName: string
): Promise<void> {
	await installSessionCookie(context, auth);
	await page.goto("/workers");
	await expect(page.getByRole("combobox")).toBeVisible({ timeout: 30_000 });
	await page.getByRole("combobox").click();
	await expect(page.getByRole("option", { name: workerName })).toBeVisible({
		timeout: 30_000,
	});
	await page.getByRole("option", { name: workerName }).click();
	await expect(page.getByText("No project selected")).toBeVisible({
		timeout: 30_000,
	});
}

function projectRow(page: Page, projectName: string) {
	return page
		.locator('[data-sidebar="menu-item"]')
		.filter({ has: page.getByText(projectName, { exact: true }) });
}

export async function addProject(
	page: Page,
	projectName: string
): Promise<string> {
	const projectPath = join(tmpdir(), projectName);
	await mkdir(projectPath, { recursive: true });

	const addButton = page.getByRole("main").getByRole("button", {
		name: "Add project",
	});
	if (await addButton.isVisible().catch(() => false)) {
		await addButton.click();
	} else {
		await page.getByRole("button", { name: "Add project" }).first().click();
	}

	const dialog = page.getByRole("dialog", { name: "Add project" });
	await expect(dialog).toBeVisible({ timeout: 15_000 });
	const input = dialog.getByRole("combobox");
	await input.fill(projectPath);
	const submit = dialog.getByRole("button", { name: ADD_PROJECT_SUBMIT_NAME });
	await expect(submit).toBeVisible({ timeout: 5000 });
	await submit.click();
	await expect(dialog).toBeHidden({ timeout: 15_000 });
	await expect(projectRow(page, projectName)).toBeVisible({ timeout: 30_000 });
	await expect(
		projectRow(page, projectName).getByText("No threads yet")
	).toBeVisible({ timeout: 15_000 });
	return projectPath;
}

export async function openNewDraft(
	page: Page,
	projectName: string
): Promise<void> {
	const row = projectRow(page, projectName);
	await row.hover();
	const newThread = row.getByRole("button", {
		name: `Create new thread in ${projectName}`,
	});
	await expect(newThread).toBeVisible({ timeout: 15_000 });
	// The project header button sits above the action until hover styles apply;
	// force avoids flake from the sortable header intercepting the hit target.
	await newThread.click({ force: true });
	await expect(page.getByText("New thread").first()).toBeVisible({
		timeout: 30_000,
	});
	await expect(page.locator('[data-chat-composer-form="true"]')).toBeVisible({
		timeout: 30_000,
	});
}

export async function selectDraftAgent(page: Page): Promise<void> {
	const footer = page.locator('[data-chat-composer-footer="true"]');
	await expect(footer).toBeVisible({ timeout: 30_000 });
	const picker = footer.getByRole("button").first();
	await expect(picker).toBeEnabled({ timeout: 60_000 });
	await picker.click();

	const agentButton = page
		.getByRole("button", { name: CLAUDE_AGENT_NAME })
		.first();
	await expect(agentButton).toBeVisible({ timeout: 30_000 });
	await agentButton.click();

	const modelOption = page
		.locator(MODEL_MENU)
		.filter({ hasNotText: CLAUDE_AGENT_NAME })
		.first();
	if (await modelOption.isVisible().catch(() => false)) {
		await modelOption.click();
	} else {
		await page.keyboard.press("Escape");
	}

	await expect(picker).not.toHaveText(AGENT_PLACEHOLDER, { timeout: 30_000 });
}

export async function sendComposerMessage(
	page: Page,
	text: string
): Promise<void> {
	const editor = page.locator(
		'[data-chat-composer-form="true"] [contenteditable="true"]'
	);
	await expect(editor).toBeVisible({ timeout: 30_000 });
	await waitForComposerIdle(page);
	await editor.click();
	await editor.pressSequentially(text, { delay: 15 });
	const send = page.getByRole("button", { name: "Send message" });
	await expect(send).toBeEnabled({ timeout: 15_000 });
	await send.click();
}

/** Wait until the composer is not mid-turn (Send message, not Stop generation). */
export async function waitForComposerIdle(page: Page): Promise<void> {
	await expect(page.getByRole("button", { name: "Send message" })).toBeVisible({
		timeout: 120_000,
	});
}

export async function expectThreadCount(
	page: Page,
	projectName: string,
	count: number
): Promise<void> {
	const row = projectRow(page, projectName);
	await expect(row.getByText(String(count), { exact: true })).toBeVisible({
		timeout: 60_000,
	});
	if (count === 0) {
		await expect(row.getByText("No threads yet")).toBeVisible();
	} else {
		await expect(row.getByText("No threads yet")).toHaveCount(0);
	}
}
