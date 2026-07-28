import { normalizeCallbackPath } from "./callback-url";

export function resolvePostSignInRedirect(
	search: string,
	defaultRedirect: string
): string {
	const callbackUrl =
		new URLSearchParams(search).get("callbackUrl") ?? undefined;
	return normalizeCallbackPath(callbackUrl) ?? defaultRedirect;
}
