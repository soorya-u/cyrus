import { E2E_WEB_URL } from "./env";

const CLIENT_ID = "cyrusd";
const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";

type AuthSession = {
	sessionCookie: string;
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

function parseSessionCookie(setCookie: string | null): string {
	if (!setCookie) {
		throw new Error("Missing session cookie from auth response.");
	}

	const match = setCookie.match(SESSION_COOKIE_PATTERN);
	if (!match?.[1]) {
		throw new Error("Could not parse better-auth.session_token cookie.");
	}

	return `better-auth.session_token=${match[1]}`;
}

async function signUpAndSignIn(
	serverUrl: string,
	email: string,
	password: string
): Promise<AuthSession> {
	const signUp = await fetch(`${serverUrl}/api/auth/sign-up/email`, {
		method: "POST",
		headers: authHeaders({ "content-type": "application/json" }),
		body: JSON.stringify({ email, name: "E2E User", password }),
	});
	if (!signUp.ok && signUp.status !== 422) {
		throw new Error(`sign-up failed: ${signUp.status} ${await signUp.text()}`);
	}

	const signIn = await fetch(`${serverUrl}/api/auth/sign-in/email`, {
		method: "POST",
		headers: authHeaders({ "content-type": "application/json" }),
		body: JSON.stringify({ email, password }),
	});
	if (!signIn.ok) {
		throw new Error(`sign-in failed: ${signIn.status} ${await signIn.text()}`);
	}

	const body = (await signIn.json()) as { user?: { id: string } };
	const sessionCookie = parseSessionCookie(signIn.headers.get("set-cookie"));
	const userId = body.user?.id;
	if (!userId) {
		throw new Error("sign-in response missing user id.");
	}

	return { sessionCookie, userId };
}

export async function seedCliAccessToken(
	serverUrl: string,
	{
		email = `e2e-${crypto.randomUUID()}@cyrus.test`,
		password = "e2e-test-password-32chars-min",
	}: { email?: string; password?: string } = {}
): Promise<{
	token: string;
	userId: string;
	sessionCookie: string;
	email: string;
}> {
	const session = await signUpAndSignIn(serverUrl, email, password);

	const codeResponse = await fetch(`${serverUrl}/api/auth/device/code`, {
		method: "POST",
		headers: authHeaders({ "content-type": "application/json" }),
		body: JSON.stringify({
			client_id: CLIENT_ID,
			scope: "openid profile email",
		}),
	});
	if (!codeResponse.ok) {
		throw new Error(
			`device code failed: ${codeResponse.status} ${await codeResponse.text()}`
		);
	}

	const codeBody = (await codeResponse.json()) as {
		device_code: string;
		user_code: string;
	};
	const formattedUserCode = codeBody.user_code.replace(/-/g, "");

	const claim = await fetch(
		`${serverUrl}/api/auth/device?user_code=${encodeURIComponent(formattedUserCode)}`,
		{
			headers: authHeaders({ cookie: session.sessionCookie }),
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
			cookie: session.sessionCookie,
		}),
		body: JSON.stringify({ userCode: formattedUserCode }),
	});
	if (!approve.ok) {
		throw new Error(
			`device approve failed: ${approve.status} ${await approve.text()}`
		);
	}

	const tokenResponse = await fetch(`${serverUrl}/api/auth/device/token`, {
		method: "POST",
		headers: authHeaders({ "content-type": "application/json" }),
		body: JSON.stringify({
			grant_type: GRANT_TYPE,
			device_code: codeBody.device_code,
			client_id: CLIENT_ID,
		}),
	});
	if (!tokenResponse.ok) {
		throw new Error(
			`device token failed: ${tokenResponse.status} ${await tokenResponse.text()}`
		);
	}

	const tokenBody = (await tokenResponse.json()) as { access_token?: string };
	if (!tokenBody.access_token) {
		throw new Error("device token response missing access_token.");
	}

	return {
		token: tokenBody.access_token,
		userId: session.userId,
		sessionCookie: session.sessionCookie,
		email,
	};
}
