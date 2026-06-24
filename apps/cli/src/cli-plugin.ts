import { type ClientStore, safeJSONParse } from "better-auth";
import {
	parseSetCookieHeader,
	stripSecureCookiePrefix,
} from "better-auth/cookies";

type StoredCookie = Record<string, { value: string; expires: string | null }>;

interface CachedSession {
	session?: { id?: string; expiresAt?: string };
	user?: { id?: string };
}

interface CliClientOptions {
	cookiePrefix?: string | string[];
	disableCache?: boolean;
	storage: {
		setItem: (key: string, value: string) => unknown;
		getItem: (key: string) => string | null;
	};
	storagePrefix?: string;
}

function getSetCookie(header: string, prevCookie?: string) {
	const parsed = parseSetCookieHeader(header);
	const toSetCookie: StoredCookie = safeJSONParse(prevCookie) ?? {};
	parsed.forEach((cookie, key) => {
		const expiresAt = cookie.expires;
		const maxAge = cookie["max-age"];
		if (maxAge !== undefined && Number(maxAge) <= 0) {
			delete toSetCookie[key];
			return;
		}
		let expires: Date | null = null;
		if (maxAge) {
			expires = new Date(Date.now() + Number(maxAge) * 1000);
		} else if (expiresAt) {
			expires = new Date(String(expiresAt));
		}
		if (expires && expires.getTime() <= Date.now()) {
			delete toSetCookie[key];
			return;
		}
		toSetCookie[key] = {
			value: cookie.value,
			expires: expires ? expires.toISOString() : null,
		};
	});
	return JSON.stringify(toSetCookie);
}

function getCookie(cookie: string) {
	let parsed: Record<string, { value: string; expires: string | null }> = {};
	try {
		parsed = JSON.parse(cookie);
	} catch {
		return "";
	}
	return Object.entries(parsed).reduce((acc, [key, value]) => {
		if (value.expires && new Date(value.expires) < new Date()) {
			return acc;
		}
		return acc ? `${acc}; ${key}=${value.value}` : `${key}=${value.value}`;
	}, "");
}

function hasSessionCookieChanged(prevCookie: string | null, newCookie: string) {
	if (!prevCookie) {
		return true;
	}
	try {
		const prev = JSON.parse(prevCookie) as Record<
			string,
			{ value: string; expires: string | null }
		>;
		const next = JSON.parse(newCookie) as Record<
			string,
			{ value: string; expires: string | null }
		>;
		const sessionKeys = new Set<string>();
		for (const key of Object.keys(prev)) {
			if (key.includes("session_token") || key.includes("session_data")) {
				sessionKeys.add(key);
			}
		}
		for (const key of Object.keys(next)) {
			if (key.includes("session_token") || key.includes("session_data")) {
				sessionKeys.add(key);
			}
		}
		for (const key of sessionKeys) {
			if (prev[key]?.value !== next[key]?.value) {
				return true;
			}
		}
		return false;
	} catch {
		return true;
	}
}

function matchesCookiePrefix(nameWithoutSecure: string, prefix: string) {
	if (prefix) {
		return nameWithoutSecure.startsWith(prefix);
	}
	return ["session_token", "session_data"].some((suffix) =>
		nameWithoutSecure.endsWith(suffix)
	);
}

function hasBetterAuthCookies(
	setCookieHeader: string,
	cookiePrefix: string | string[]
) {
	const cookies = parseSetCookieHeader(setCookieHeader);
	const prefixes = Array.isArray(cookiePrefix) ? cookiePrefix : [cookiePrefix];
	for (const name of cookies.keys()) {
		const nameWithoutSecure = stripSecureCookiePrefix(name);
		if (
			prefixes.some((prefix) => matchesCookiePrefix(nameWithoutSecure, prefix))
		) {
			return true;
		}
	}
	return false;
}

export function cliClient(opts: CliClientOptions) {
	let store: ClientStore | null = null;
	const storagePrefix = opts.storagePrefix ?? "cyrus";
	const cookieName = `${storagePrefix}_cookie`;
	const localCacheName = `${storagePrefix}_session_data`;
	const cookiePrefix = opts.cookiePrefix ?? "better-auth";

	return {
		id: "cli",
		getActions(_: unknown, $store: ClientStore) {
			store = $store;
			const sessionAtom = $store.atoms.session;
			if (!opts.disableCache && sessionAtom) {
				const raw = opts.storage.getItem(localCacheName);
				const cached = raw
					? (safeJSONParse(raw) as CachedSession | null)
					: null;
				const exp = cached?.session?.expiresAt;
				const expMs = exp ? new Date(exp).getTime() : Number.NaN;
				if (cached?.user?.id && cached.session?.id && expMs > Date.now()) {
					sessionAtom.set({
						...sessionAtom.get(),
						data: cached,
						error: null,
					});
				}
			}
			return {
				getCookie: () => getCookie(opts.storage.getItem(cookieName) ?? "{}"),
			};
		},
		fetchPlugins: [
			{
				id: "cli",
				name: "CLI",
				hooks: {
					onSuccess(context: {
						response: { headers: { get: (name: string) => string | null } };
						request: { url: { toString: () => string } };
						data?: unknown;
					}) {
						const setCookie = context.response.headers.get("set-cookie");
						if (setCookie && hasBetterAuthCookies(setCookie, cookiePrefix)) {
							const prevCookie = opts.storage.getItem(cookieName);
							const toSetCookie = getSetCookie(
								setCookie,
								prevCookie ?? undefined
							);
							if (hasSessionCookieChanged(prevCookie, toSetCookie)) {
								opts.storage.setItem(cookieName, toSetCookie);
								store?.notify("$sessionSignal");
							} else {
								opts.storage.setItem(cookieName, toSetCookie);
							}
						}
						if (
							context.request.url.toString().includes("/get-session") &&
							!opts.disableCache
						) {
							opts.storage.setItem(
								localCacheName,
								JSON.stringify(context.data)
							);
						}
					},
				},
				init(
					url: string,
					options: {
						credentials?: "omit" | "include" | "same-origin";
						headers?: Record<string, string>;
					} = {}
				) {
					options.credentials = "omit";
					const cookie = getCookie(opts.storage.getItem(cookieName) ?? "{}");
					options.headers = {
						...options.headers,
						...(cookie ? { cookie } : {}),
					};

					if (url.includes("/sign-out")) {
						opts.storage.setItem(cookieName, "{}");
						store?.atoms.session?.set({
							...store.atoms.session.get(),
							data: null,
							error: null,
							isPending: false,
						});
						opts.storage.setItem(localCacheName, "{}");
					}

					return { url, options };
				},
			},
		],
	};
}
