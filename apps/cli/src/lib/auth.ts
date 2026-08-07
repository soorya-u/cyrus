import { wsTicketClientPlugin } from "@soorya-u/better-auth-ws-ticket/client";
import { createAuthClient } from "better-auth/client";
import {
	deviceAuthorizationClient,
	inferAdditionalFields,
} from "better-auth/client/plugins";
import { Result } from "better-result";
import { get } from "@/store/config";
import { env } from "./env";

export const authClient = createAuthClient({
	baseURL: env.CLI_PUBLIC_SERVER_URL,
	plugins: [
		deviceAuthorizationClient(),
		wsTicketClientPlugin(),
		inferAdditionalFields({
			session: {
				workerName: { type: "string", required: false },
			},
		}),
	],
	fetchOptions: {
		auth: {
			type: "Bearer",
			token: async () => (await get("token")) ?? undefined,
		},
	},
});

export async function syncWorkerName(
	name: string
): Promise<Result<void, string>> {
	const { error } = await authClient.updateSession({ workerName: name });
	if (error)
		return Result.err(
			error.message || "Failed to sync worker name with the server"
		);
	return Result.ok();
}
