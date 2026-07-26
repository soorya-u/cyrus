import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
		CLOUDFLARE_DATABASE_ID: z.string().optional(),
		CLOUDFLARE_D1_TOKEN: z.string().optional(),
		D1_LOCAL_DB: z.string().default("file:./.local/d1/cyrus.sqlite"),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
	createFinalSchema: (shape) =>
		z.object(shape).transform((raw, ctx) => {
			const accountId = raw.CLOUDFLARE_ACCOUNT_ID;
			const databaseId = raw.CLOUDFLARE_DATABASE_ID;
			const token = raw.CLOUDFLARE_D1_TOKEN;

			if (accountId && databaseId && token)
				return {
					driver: "d1-http" as const,
					accountId,
					databaseId,
					token,
				};

			if (accountId || databaseId || token) {
				ctx.addIssue({
					code: "custom",
					message:
						"Set all of CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, and CLOUDFLARE_D1_TOKEN for remote D1, or none of them to use D1_LOCAL_DB",
				});
				return z.NEVER;
			}

			return {
				url: raw.D1_LOCAL_DB,
			};
		}),
});
