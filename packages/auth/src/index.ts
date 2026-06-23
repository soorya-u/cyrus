import { expo } from "@better-auth/expo";
import { db } from "@cyrus/db";
import {
	account,
	accountRelations,
	session,
	sessionRelations,
	user,
	userRelations,
	verification,
} from "@cyrus/db/schema/auth";
import { env } from "@cyrus/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";

export const auth = betterAuth({
	basePath: "/api/auth",
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			account,
			accountRelations,
			session,
			sessionRelations,
			user,
			userRelations,
			verification,
		},
	}),
	trustedOrigins: [
		env.CORS_ORIGIN,
		"http://localhost:5173",
		"http://localhost:8081",
		"exp://",
		"cyrus://",
	],
	socialProviders: {
		github: {
			clientId: env.GITHUB_CLIENT_ID,
			clientSecret: env.GITHUB_CLIENT_SECRET,
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
	plugins: [expo(), openAPI()],
});

export type Auth = typeof auth;
