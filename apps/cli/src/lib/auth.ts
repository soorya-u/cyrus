import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import { get } from "@/utils/store";
import { env } from "./env";

export const authClient = createAuthClient({
	baseURL: env.CLI_PUBLIC_SERVER_URL,
	plugins: [deviceAuthorizationClient()],
	fetchOptions: {
		auth: {
			type: "Bearer",
			token: async () => (await get("token")) ?? undefined,
		},
	},
});
