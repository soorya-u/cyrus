import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { models as schema } from "../db/models";
import { authOptions } from "./options";

const db = drizzle(env.DB);

export const auth = betterAuth({
	...withCloudflare(
		{
			autoDetectIpAddress: true,
			geolocationTracking: false,
			cf: {},
			d1: {
				db: db as never,
				options: { schema },
			},
		},
		authOptions
	),
});
