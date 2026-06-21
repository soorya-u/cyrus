import { createWebAuthClient } from "@cyrus/auth/client/web";
import { env } from "@cyrus/env/web";

export const authClient = createWebAuthClient({
	baseURL: env.VITE_SERVER_URL,
});
