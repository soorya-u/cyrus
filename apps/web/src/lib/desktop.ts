import { defineAuthWebviewRPC } from "@soorya-u/better-auth-desktop/rpc/webview";

export const isDesktop =
	typeof window !== "undefined" && !!window.__electrobunWebviewId;

export const desktopAuth = isDesktop ? defineAuthWebviewRPC() : null;
