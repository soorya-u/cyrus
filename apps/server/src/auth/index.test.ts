import { exports } from "cloudflare:workers";
import { describe, expect, test, vi } from "vitest";
import { resend } from "../emails";

const worker = exports.default;
const ORIGIN = "https://cyrus.soorya-u.dev";
const CLIENT_ID = "cyrusd";
const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";
const SESSION_COOKIE_PATTERN =
	/(?:__Secure-)?better-auth\.session_token=([^;]+)/;

function authHeaders(
	extra: Record<string, string> = {}
): Record<string, string> {
	return {
		origin: ORIGIN,
		referer: `${ORIGIN}/`,
		...extra,
	};
}

function sessionCookieFromResponse(response: Response): string {
	const setCookies =
		typeof response.headers.getSetCookie === "function"
			? response.headers.getSetCookie()
			: [response.headers.get("set-cookie")].filter((value): value is string =>
					Boolean(value)
				);

	for (const header of setCookies) {
		const match = header.match(SESSION_COOKIE_PATTERN);
		if (match?.[0] && match[1]) {
			// Preserve __Secure- prefix when present — better-auth sets it on HTTPS.
			const nameAndValue = match[0];
			return nameAndValue;
		}
	}

	throw new Error(
		`Missing session cookie. set-cookie headers: ${JSON.stringify(setCookies)}`
	);
}

async function signUpAndSignIn(email: string, password: string) {
	const signUp = await worker.fetch(
		"https://cyrus.soorya-u.dev/api/auth/sign-up/email",
		{
			method: "POST",
			headers: authHeaders({ "content-type": "application/json" }),
			body: JSON.stringify({ email, name: "D1 Auth User", password }),
		}
	);
	expect(signUp.ok || signUp.status === 422).toBe(true);

	const signIn = await worker.fetch(
		"https://cyrus.soorya-u.dev/api/auth/sign-in/email",
		{
			method: "POST",
			headers: authHeaders({ "content-type": "application/json" }),
			body: JSON.stringify({ email, password }),
		}
	);
	expect(signIn.ok).toBe(true);

	const body = (await signIn.json()) as { user?: { id: string } };
	const userId = body.user?.id;
	expect(userId).toBeTruthy();
	if (!userId) {
		throw new Error("sign-in response missing user id");
	}

	const sessionCookie = sessionCookieFromResponse(signIn);

	const sessionCheck = await worker.fetch(
		"https://cyrus.soorya-u.dev/api/auth/get-session",
		{ headers: authHeaders({ cookie: sessionCookie }) }
	);
	const sessionBody = (await sessionCheck.json()) as {
		user?: { id: string };
	} | null;
	expect(sessionBody?.user?.id).toBe(userId);

	return {
		sessionCookie,
		userId,
	};
}

describe("device authorization against D1", () => {
	test("completes request → approve → token against D1-backed auth data", async () => {
		const email = `d1-auth-${crypto.randomUUID()}@cyrus.test`;
		const password = "d1-auth-test-password-32chars-min";
		const session = await signUpAndSignIn(email, password);

		const codeResponse = await worker.fetch(
			"https://cyrus.soorya-u.dev/api/auth/device/code",
			{
				method: "POST",
				headers: authHeaders({ "content-type": "application/json" }),
				body: JSON.stringify({
					client_id: CLIENT_ID,
					scope: "openid profile email",
				}),
			}
		);
		expect(codeResponse.ok).toBe(true);

		const codeBody = (await codeResponse.json()) as {
			device_code: string;
			user_code: string;
		};
		expect(codeBody.device_code).toBeTruthy();
		expect(codeBody.user_code).toBeTruthy();

		const formattedUserCode = codeBody.user_code.replace(/-/g, "");

		const claim = await worker.fetch(
			`https://cyrus.soorya-u.dev/api/auth/device?user_code=${encodeURIComponent(formattedUserCode)}`,
			{ headers: authHeaders({ cookie: session.sessionCookie }) }
		);
		expect(claim.ok).toBe(true);

		const approve = await worker.fetch(
			"https://cyrus.soorya-u.dev/api/auth/device/approve",
			{
				method: "POST",
				headers: authHeaders({
					"content-type": "application/json",
					cookie: session.sessionCookie,
				}),
				body: JSON.stringify({ userCode: formattedUserCode }),
			}
		);
		expect(approve.ok).toBe(true);

		const tokenResponse = await worker.fetch(
			"https://cyrus.soorya-u.dev/api/auth/device/token",
			{
				method: "POST",
				headers: authHeaders({ "content-type": "application/json" }),
				body: JSON.stringify({
					grant_type: GRANT_TYPE,
					device_code: codeBody.device_code,
					client_id: CLIENT_ID,
				}),
			}
		);
		expect(tokenResponse.ok).toBe(true);

		const tokenBody = (await tokenResponse.json()) as {
			access_token?: string;
		};
		expect(tokenBody.access_token).toBeTruthy();
	});

	test("accepts magic-link sign-in requests", async () => {
		const email = `magic-link-${crypto.randomUUID()}@cyrus.test`;
		const sendSpy = vi.spyOn(resend.emails, "send").mockResolvedValue({
			data: { id: "email_test" },
			error: null,
			headers: null,
		});

		try {
			const requestMagicLink = await worker.fetch(
				"https://cyrus.soorya-u.dev/api/auth/sign-in/magic-link",
				{
					method: "POST",
					headers: authHeaders({ "content-type": "application/json" }),
					body: JSON.stringify({
						email,
						callbackURL: "https://cyrus.soorya-u.dev/workers",
					}),
				}
			);
			expect(requestMagicLink.ok).toBe(true);
			expect(sendSpy).toHaveBeenCalled();
		} finally {
			sendSpy.mockRestore();
		}
	});
});
