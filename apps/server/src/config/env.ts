import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string(),
		PORT: z.coerce.number(),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		OAUTH_GITHUB_CLIENT_ID: z.string(),
		OAUTH_GITHUB_CLIENT_SECRET: z.string(),
		OAUTH_PROXY_SECRET: z.string(),
		NODE_ENV: z.enum(["development", "production"]).default("development"),
		PRODUCTION_URL: z.url(),
		ALLOWED_ORIGINS: z
			.string()
			.optional()
			.transform((val) =>
				val
					? val
							.split(",")
							.map((o) => o.trim())
							.filter(Boolean)
					: []
			),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
