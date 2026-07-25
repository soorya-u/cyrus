import { expo } from "@better-auth/expo";
import { betterAuthDesktop } from "@soorya-u/better-auth-desktop/server";
import { wsTicketPlugin } from "@soorya-u/better-auth-ws-ticket/server";
import { betterAuth } from "better-auth";
import { bearer, deviceAuthorization, oAuthProxy } from "better-auth/plugins";
import { withCloudflare } from "better-auth-cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { log } from "evlog";
import { env } from "../config/env";
// biome-ignore lint/performance/noNamespaceImport: drizzle adapter requires schema as namespace
import * as schema from "../db/models";

const emailAndPassword =
	env.NODE_ENV === "production"
		? {}
		: {
				emailAndPassword: {
					enabled: true,
					autoSignIn: true,
				},
			};

const authOptions = {
	appName: "Cyrus",
	basePath: "/api/auth",
	...emailAndPassword,
	trustedOrigins: [...env.ALLOWED_ORIGINS, env.PRODUCTION_URL],
	socialProviders: {
		github: {
			clientId: env.OAUTH_GITHUB_CLIENT_ID,
			clientSecret: env.OAUTH_GITHUB_CLIENT_SECRET,
		},
	},
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.WEB_APP_URL,
	advanced: {
		defaultCookieAttributes: {
			sameSite: "lax" as const,
			httpOnly: true,
			secure: env.NODE_ENV === "production",
		},
	},
	logger: {
		log: (
			level: "debug" | "info" | "warn" | "error",
			message: string,
			...args: unknown[]
		) => log[level]({ message, ...args }),
		level: env.LOG_LEVEL,
	},
	plugins: [
		expo(),
		betterAuthDesktop({
			clientID: "cyrus-desktop",
			webCallbackUrl: `${env.WEB_APP_URL}/auth/callback`,
		}),
		oAuthProxy({
			productionURL: env.PRODUCTION_URL,
			secret: env.OAUTH_PROXY_SECRET,
		}),
		deviceAuthorization({ verificationUri: `${env.WEB_APP_URL}/auth/device` }),
		bearer(),
		wsTicketPlugin(),
	],
};

type AuthInstance = ReturnType<typeof createAuth>;

const authByDb = new WeakMap<D1Database, AuthInstance>();

/** Runtime auth bound to the Worker's D1 binding via withCloudflare + Drizzle. */
function createAuth(d1: D1Database) {
	// drizzle-orm 1.0 dropped the client `schema` option; the adapter still needs it.
	const db = drizzle(d1);

	return betterAuth({
		...withCloudflare(
			{
				autoDetectIpAddress: true,
				// Session table has no geolocation columns — keep schema as-is (#110).
				geolocationTracking: false,
				cf: {},
				d1: {
					// better-auth-cloudflare types against drizzle-orm ^0.45; this
					// workspace pins 1.0 — DrizzleD1Database is structurally the same
					// at runtime but distinct across the two package instances.
					db: db as never,
					options: {
						schema,
						// D1 has no interactive transactions.
						transaction: false,
					},
				},
			},
			authOptions
		),
	});
}

/** Cached per-isolate auth instance for the given D1 binding. */
export function getAuth(d1: D1Database) {
	const cached = authByDb.get(d1);
	if (cached) return cached;

	const instance = createAuth(d1);
	authByDb.set(d1, instance);
	return instance;
}

/**
 * CLI schema generation (`auth:generate`) — no D1 binding available.
 * Runtime callers must use `getAuth(env.DB)`.
 */
export const auth = betterAuth({
	...withCloudflare(
		{
			autoDetectIpAddress: false,
			geolocationTracking: false,
		},
		authOptions
	),
});
