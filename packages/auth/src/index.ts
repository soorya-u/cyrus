import { expo } from "@better-auth/expo";
import { createDb } from "@cyrus/db";
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

export type Auth = ReturnType<typeof createAuth>;

function createAuth() {
	const db = createDb();

	return betterAuth({
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
		emailAndPassword: {
			enabled: true,
		},
		socialProviders: {
			github: {
				clientId: process.env.GITHUB_CLIENT_ID as string,
				clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
			},
		},
		user: {
			additionalFields: {
				role: {
					type: "string",
					defaultValue: "user",
					input: false,
				},
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
		plugins: [expo()],
	});
}

export const auth = createAuth();
