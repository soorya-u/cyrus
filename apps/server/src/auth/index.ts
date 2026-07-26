import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";
import { drizzle } from "drizzle-orm/d1";
// biome-ignore lint/performance/noNamespaceImport: drizzle adapter requires schema as namespace
import * as schema from "../db/models";
import { authOptions } from "./options";

// drizzle-orm 1.0 dropped the client `schema` option; the adapter still needs it.
const db = drizzle(env.DB);

export const auth = betterAuth({
	...withCloudflare(
		{
			autoDetectIpAddress: true,
			// Session table has no geolocation columns — keep schema as-is (#110).
			geolocationTracking: false,
			cf: {},
			d1: {
				// better-auth-cloudflare types against drizzle-orm ^0.45; this
				// workspace pins 1.0 — DrizzleD1Database is structurally the same
				// at runtime but distinct across the two package instances.
				db: db as never,
				options: {
					schema,
					// D1 has no interactive transactions.
					transaction: false,
				},
			},
		},
		authOptions
	),
});
