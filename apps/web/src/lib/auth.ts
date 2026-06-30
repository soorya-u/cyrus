import { useSession } from "@soorya-u/better-auth-desktop/react";
import { webDesktop, wrapForDesktop } from "@soorya-u/better-auth-desktop/web";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { desktopAuth, isDesktop } from "./desktop";
import { env } from "./env";

const base = createAuthClient({
	baseURL: env.VITE_SERVER_URL,
	plugins: [webDesktop(), deviceAuthorizationClient()],
});

export const authClient = isDesktop
	? wrapForDesktop(base, desktopAuth, useSession)
	: base;
