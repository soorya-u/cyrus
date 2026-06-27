import { expo } from "@better-auth/expo";
import { betterAuthDesktop } from "@soorya-u/better-auth-desktop/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy } from "better-auth/plugins";
import { log } from "evlog";
import { env } from "../config/env";
import { db } from "../db";
// biome-ignore lint/performance/noNamespaceImport: drizzle adapter requires schema as namespace
import * as schema from "../db/models";

export const auth = betterAuth({
	appName: "Cyrus",
	basePath: "/api/auth",
	database: drizzleAdapter(db, { provider: "pg", schema }),
	trustedOrigins: [...env.ALLOWED_ORIGINS, env.PRODUCTION_URL],
	socialProviders: {
		github: {
			clientId: env.OAUTH_GITHUB_CLIENT_ID,
			clientSecret: env.OAUTH_GITHUB_CLIENT_SECRET,
		},
	},
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	advanced: {
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
			httpOnly: true,
		},
	},
	logger: {
		log: (level, message, ...args) => log[level]({ message, ...args }),
		level: env.LOG_LEVEL,
	},
	plugins: [
		expo(),
		// Desktop OAuth hand-off via a 127.0.0.1 loopback navigation. Default is a
		// direct redirect to the desktop loopback (no web callback page needed).
		betterAuthDesktop({ clientID: "cyrus-desktop" }),
		oAuthProxy({
			productionURL: env.PRODUCTION_URL,
			secret: env.OAUTH_PROXY_SECRET,
		}),
	],
});

export type Auth = typeof auth;
