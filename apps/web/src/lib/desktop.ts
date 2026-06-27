// Desktop (Electrobun WebView) integration — keeps desktop branching out of the
// rest of the app, which uses the regular auth client and hooks.
import { defineAuthWebviewRPC } from "@soorya-u/better-auth-desktop/rpc/webview";

/** True when running inside an Electrobun WebView. */
export const isDesktop =
	typeof window !== "undefined" && !!window.__electrobunWebviewId;

/** RPC bridge to the Bun main process; null in the browser. */
export const desktopAuth = isDesktop ? defineAuthWebviewRPC() : null;

/** Routes `signIn.social` through the RPC bridge on desktop; no-op in the browser. */
export function wrapAuthClientForDesktop<T extends object>(base: T): T {
	const bridge = desktopAuth;
	if (!bridge) {
		return base;
	}
	return new Proxy(base, {
		get(target, prop, receiver) {
			if (prop !== "signIn") {
				return Reflect.get(target, prop, receiver);
			}
			const signIn = Reflect.get(target, prop, receiver) as object;
			return new Proxy(signIn, {
				get(signInTarget, signInProp, signInReceiver) {
					if (signInProp !== "social") {
						return Reflect.get(signInTarget, signInProp, signInReceiver);
					}
					return (params: { provider: string }) =>
						bridge.requestAuth({ provider: params.provider });
				},
			});
		},
	});
}
