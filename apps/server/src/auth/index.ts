import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy, openAPI } from "better-auth/plugins";
import { env } from "../config/env";
import { db } from "../db";
// biome-ignore lint/performance/noNamespaceImport: drizzle adapter requires schema as namespace
import * as schema from "../db/models";

export const auth = betterAuth({
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
	plugins: [
		expo(),
		...(env.NODE_ENV === "production" ? [] : [openAPI()]),
		oAuthProxy({
			productionURL: env.PRODUCTION_URL,
			secret: env.OAUTH_PROXY_SECRET,
		}),
	],
});

export type Auth = typeof auth;
