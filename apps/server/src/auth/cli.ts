import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { models as schema } from "../db/models";
import { authOptions } from "./options";

// This if for CLI schema generation (`auth:generate`)
const db = drizzle({} as never);

export const auth = betterAuth({
	...withCloudflare(
		{
			autoDetectIpAddress: false,
			geolocationTracking: false,
			d1: { db: db as never, options: { schema } },
		},
		authOptions
	),
});
