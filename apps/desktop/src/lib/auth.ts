import { electrobunClient, storage } from "@soorya-u/better-auth-electrobun";
import { createAuthClient } from "better-auth/client";
import { env } from "./env";

export const authClient = createAuthClient({
	baseURL: env.ELECTROBUN_SERVER_URL,
	plugins: [
		electrobunClient({
			protocol: { scheme: "dev.soorya-u.cyrus" },
			signInURL: env.ELECTROBUN_WEB_APP_URL,
			storage: storage(),
		}),
	],
});
