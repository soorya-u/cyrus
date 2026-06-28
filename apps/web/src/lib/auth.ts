import { webDesktop } from "@soorya-u/better-auth-desktop/web";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { isDesktop, wrapAuthClientForDesktop } from "./desktop";
import { env } from "./env";

const base = createAuthClient({
	baseURL: env.VITE_SERVER_URL,
	plugins: [webDesktop(), deviceAuthorizationClient()],
});

export const authClient = isDesktop ? wrapAuthClientForDesktop(base) : base;
