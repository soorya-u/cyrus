import { defineAuthWebviewRPC } from "@soorya-u/better-auth-desktop/rpc/webview";
import { useEffect, useState } from "react";

export const isDesktop =
	typeof window !== "undefined" && !!window.__electrobunWebviewId;

export const desktopAuth = isDesktop ? defineAuthWebviewRPC() : null;

type DesktopUser = { id: string; email: string; name: string } & Record<
	string,
	unknown
>;

function useDesktopSession() {
	const [data, setData] = useState<{ user: DesktopUser } | null>(null);
	const [isPending, setIsPending] = useState(true);
	useEffect(() => {
		const bridge = desktopAuth;
		if (!bridge) {
			setIsPending(false);
			return;
		}
		bridge
			.getUser()
			.then((user) => {
				setData(user ? { user: user as DesktopUser } : null);
				setIsPending(false);
			})
			.catch(() => setIsPending(false));
		const offAuth = bridge.onAuthenticated((user) => {
			setData({ user: user as DesktopUser });
		});
		const offUpdate = bridge.onUserUpdated((user) => {
			setData(user ? { user: user as DesktopUser } : null);
		});
		return () => {
			offAuth();
			offUpdate();
		};
	}, []);
	return { data, isPending, error: null };
}

export function wrapAuthClientForDesktop<T extends object>(base: T): T {
	const bridge = desktopAuth;
	if (!bridge) {
		return base;
	}
	return new Proxy(base, {
		get(target, prop, receiver) {
			if (prop === "useSession") {
				return useDesktopSession;
			}
			if (prop === "getSession") {
				return () =>
					bridge.getUser().then((user) => ({ data: user ? { user } : null }));
			}
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
