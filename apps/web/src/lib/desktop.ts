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
		let disposed = false;
		let sawEvent = false;
		const applyUser = (user: DesktopUser | null) => {
			sawEvent = true;
			if (disposed) {
				return;
			}
			setData(user ? { user } : null);
			setIsPending(false);
		};
		const offAuth = bridge.onAuthenticated((user) =>
			applyUser(user as DesktopUser)
		);
		const offUpdate = bridge.onUserUpdated((user) =>
			applyUser(user ? (user as DesktopUser) : null)
		);
		bridge
			.getUser()
			.then((user) => {
				if (disposed || sawEvent) {
					return;
				}
				setData(user ? { user: user as DesktopUser } : null);
				setIsPending(false);
			})
			.catch(() => {
				if (!(disposed || sawEvent)) {
					setIsPending(false);
				}
			});
		return () => {
			disposed = true;
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
					bridge
						.getUser()
						.then((user) => ({ data: user ? { user } : null, error: null }))
						.catch((error: unknown) => ({ data: null, error }));
			}
			if (prop === "signOut") {
				return () => bridge.signOut();
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
