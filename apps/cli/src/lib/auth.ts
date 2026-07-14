import { wsTicketClientPlugin } from "@soorya-u/better-auth-ws-ticket/client";
import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import { get } from "@/store/config";
import { env } from "./env";

export const authClient = createAuthClient({
	baseURL: env.CLI_PUBLIC_SERVER_URL,
	plugins: [deviceAuthorizationClient(), wsTicketClientPlugin()],
	fetchOptions: {
		auth: {
			type: "Bearer",
			token: async () => (await get("token")) ?? undefined,
		},
	},
});
