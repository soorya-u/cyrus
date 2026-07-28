import { expo } from "@better-auth/expo";
import { betterAuthDesktop } from "@soorya-u/better-auth-desktop/server";
import { wsTicketPlugin } from "@soorya-u/better-auth-ws-ticket/server";
import type { BetterAuthOptions } from "better-auth";
import {
	bearer,
	deviceAuthorization,
	magicLink,
	oAuthProxy,
} from "better-auth/plugins";
import { log } from "evlog";
import { env } from "../config/env";
import { sendMagicLinkEmail } from "../emails/magic-email";

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
		google: {
			clientId: env.OAUTH_GOOGLE_CLIENT_ID,
			clientSecret: env.OAUTH_GOOGLE_CLIENT_SECRET,
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
		) => log[level]({ message, args }),
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
		magicLink({
			disableSignUp: false,
			sendMagicLink: async ({ email, url }) =>
				sendMagicLinkEmail({
					fromEmail: env.RESEND_FROM_EMAIL,
					toEmail: email,
					signInUrl: url,
				}),
		}),
		deviceAuthorization({ verificationUri: `${env.WEB_APP_URL}/auth/device` }),
		bearer(),
		wsTicketPlugin(),
	],
} satisfies BetterAuthOptions;
