import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";
import { authOptions } from "./options";

// This if for CLI schema generation (`auth:generate`)
export const auth = betterAuth({
	...withCloudflare(
		{
			autoDetectIpAddress: false,
			geolocationTracking: false,
		},
		authOptions
	),
});
