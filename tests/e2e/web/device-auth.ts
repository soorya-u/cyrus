import { rm } from "node:fs/promises";
import { type Browser, expect } from "@playwright/test";
import { createE2eAuthSession, type E2eAuth } from "../harness/auth";
import { readAccessTokenFromHome, startCliLogin } from "../harness/cli-login";
import {
	createTempCyrusHome,
	E2E_SERVER_URL,
	E2E_WEB_URL,
} from "../harness/env";

/**
 * Completes device authorization the way a real user does: compiled `cyrusd
 * login` prints a code + URL, then a browser session approves it on
 * `/auth/device`. Account creation stays programmatic (email API).
 */
export async function seedCliAccessTokenViaDeviceUi(
	browser: Browser,
	serverUrl = E2E_SERVER_URL
): Promise<E2eAuth> {
	const email = `e2e-${crypto.randomUUID()}@cyrus.test`;
	const password = "e2e-test-password-32chars-min";
	const session = await createE2eAuthSession(serverUrl, email, password);
	const home = await createTempCyrusHome();
	let login: Awaited<ReturnType<typeof startCliLogin>> | undefined;

	try {
		login = await startCliLogin(home);
		await approveDeviceInBrowser(
			browser,
			session.sessionToken,
			login.prompt.verificationUrl
		);
		await login.waitUntilDone();
		const token = await readAccessTokenFromHome(home);

		return {
			token,
			userId: session.userId,
			sessionCookie: session.sessionCookie,
			sessionToken: session.sessionToken,
			email,
		};
	} catch (error) {
		login?.kill();
		throw error;
	} finally {
		await rm(home, { force: true, recursive: true });
	}
}

async function approveDeviceInBrowser(
	browser: Browser,
	sessionToken: string,
	verificationUrl: string
): Promise<void> {
	const context = await browser.newContext({ baseURL: E2E_WEB_URL });
	try {
		await context.addCookies([
			{
				name: "better-auth.session_token",
				value: sessionToken,
				domain: "localhost",
				path: "/",
				httpOnly: true,
				secure: false,
				sameSite: "Lax",
			},
		]);

		const page = await context.newPage();
		await page.goto(verificationUrl);
		await expect(
			page.getByRole("heading", { name: "Authorize device" })
		).toBeVisible({ timeout: 30_000 });
		await page.getByRole("button", { name: "Approve" }).click();
		await expect(
			page.getByRole("heading", { name: "Device connected" })
		).toBeVisible({ timeout: 30_000 });
	} finally {
		await context.close();
	}
}
