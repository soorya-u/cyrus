import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";
import { authOptions } from "./options";

/**
 * CLI schema generation (`auth:generate`) — no D1 binding outside the Worker.
 *
 * @public
 */
export const auth = betterAuth({
	...withCloudflare(
		{
			autoDetectIpAddress: false,
			geolocationTracking: false,
		},
		authOptions
	),
});
