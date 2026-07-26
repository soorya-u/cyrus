import { expo } from "@better-auth/expo";
import { betterAuthDesktop } from "@soorya-u/better-auth-desktop/server";
import { wsTicketPlugin } from "@soorya-u/better-auth-ws-ticket/server";
import type { BetterAuthOptions } from "better-auth";
import { bearer, deviceAuthorization, oAuthProxy } from "better-auth/plugins";
import { log } from "evlog";
import { env } from "../config/env";

const emailAndPassword =
	env.NODE_ENV === "production"
		? {}
		: {
				emailAndPassword: {
					enabled: true,
					autoSignIn: true,
				},
			};

export const authOptions = {
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
} satisfies BetterAuthOptions;
