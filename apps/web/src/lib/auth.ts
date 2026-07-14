import { useSession } from "@soorya-u/better-auth-desktop/react";
import { defineAuthWebviewRPC } from "@soorya-u/better-auth-desktop/rpc/webview";
import { webDesktop, wrapForDesktop } from "@soorya-u/better-auth-desktop/web";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { env } from "./env";

const isDesktop = env.VITE_IS_DESKTOP;

const base = createAuthClient({
	baseURL: env.VITE_APP_URL,
	plugins: [webDesktop(), deviceAuthorizationClient()],
});

export const desktopAuth = isDesktop ? defineAuthWebviewRPC() : null;

export const authClient = isDesktop
	? wrapForDesktop(base, desktopAuth, useSession)
	: base;
