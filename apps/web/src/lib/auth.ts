import { webDesktop } from "@soorya-u/better-auth-desktop/web";
import { createAuthClient } from "better-auth/react";
import { isDesktop, wrapAuthClientForDesktop } from "./desktop";
import { env } from "./env";

const base = createAuthClient({
	baseURL: env.VITE_SERVER_URL,
	plugins: [webDesktop()],
});

export const authClient = isDesktop ? wrapAuthClientForDesktop(base) : base;
