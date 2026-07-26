import { E2E_WEB_URL } from "./env";

export type E2eAuth = {
	token: string;
	userId: string;
	sessionCookie: string;
	sessionToken: string;
	email: string;
};

type AuthSession = {
	sessionCookie: string;
	sessionToken: string;
	userId: string;
};

const SESSION_COOKIE_PATTERN = /better-auth\.session_token=([^;]+)/;

function authHeaders(
	extra: Record<string, string> = {}
): Record<string, string> {
	return {
		origin: E2E_WEB_URL,
		referer: `${E2E_WEB_URL}/`,
		...extra,
	};
}

function parseSessionCookie(setCookie: string | null): {
	sessionCookie: string;
	sessionToken: string;
} {
	if (!setCookie) throw new Error("Missing session cookie from auth response.");

	const match = setCookie.match(SESSION_COOKIE_PATTERN);
	if (!match?.[1])
		throw new Error("Could not parse better-auth.session_token cookie.");

	return {
		sessionCookie: `better-auth.session_token=${match[1]}`,
		sessionToken: match[1],
	};
}

/** Creates a unique email/password account via the auth API (testing-only). */
export async function createE2eAuthSession(
	serverUrl: string,
	email: string,
	password: string
): Promise<AuthSession> {
	const signUp = await fetch(`${serverUrl}/api/auth/sign-up/email`, {
		method: "POST",
		headers: authHeaders({ "content-type": "application/json" }),
		body: JSON.stringify({ email, name: "E2E User", password }),
	});
	if (!signUp.ok && signUp.status !== 422)
		throw new Error(`sign-up failed: ${signUp.status} ${await signUp.text()}`);

	const signIn = await fetch(`${serverUrl}/api/auth/sign-in/email`, {
		method: "POST",
		headers: authHeaders({ "content-type": "application/json" }),
		body: JSON.stringify({ email, password }),
	});
	if (!signIn.ok)
		throw new Error(`sign-in failed: ${signIn.status} ${await signIn.text()}`);

	const body = (await signIn.json()) as { user?: { id: string } };
	const { sessionCookie, sessionToken } = parseSessionCookie(
		signIn.headers.get("set-cookie")
	);
	const userId = body.user?.id;
	if (!userId) {
		throw new Error("sign-in response missing user id.");
	}

	return { sessionCookie, sessionToken, userId };
}

/**
 * Approves a device user code for an already-signed-in session (claim + approve).
 * Used when the Worker CLI has already started the device-code flow itself.
 */
export async function approveDeviceUserCode(
	serverUrl: string,
	sessionCookie: string,
	userCode: string
): Promise<void> {
	const formattedUserCode = userCode.replace(/-/g, "");

	const claim = await fetch(
		`${serverUrl}/api/auth/device?user_code=${encodeURIComponent(formattedUserCode)}`,
		{
			headers: authHeaders({ cookie: sessionCookie }),
		}
	);
	if (!claim.ok) {
		throw new Error(
			`device claim failed: ${claim.status} ${await claim.text()}`
		);
	}

	const approve = await fetch(`${serverUrl}/api/auth/device/approve`, {
		method: "POST",
		headers: authHeaders({
			"content-type": "application/json",
			cookie: sessionCookie,
		}),
		body: JSON.stringify({ userCode: formattedUserCode }),
	});
	if (!approve.ok) {
		throw new Error(
			`device approve failed: ${approve.status} ${await approve.text()}`
		);
	}
}
