export function normalizeCallbackPath(
	callbackUrl: string | undefined
): string | null {
	if (!callbackUrl) return null;
	if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) return null;

	return callbackUrl;
}

export function toAbsoluteCallbackUrl(callbackPath: string): string {
	return new URL(callbackPath, window.location.origin).toString();
}

export function resolvePostSignInRedirect(
	search: string,
	defaultRedirect: string
): string {
	const callbackUrl =
		new URLSearchParams(search).get("callbackUrl") ?? undefined;
	return normalizeCallbackPath(callbackUrl) ?? defaultRedirect;
}

export function buildDeviceCallbackPath(userCode: string | undefined): string {
	const normalizedCode = (userCode ?? "")
		.replace(/[^a-zA-Z0-9]/g, "")
		.toUpperCase();
	if (!normalizedCode) {
		return "/auth/device";
	}

	return `/auth/device?user_code=${encodeURIComponent(normalizedCode)}`;
}
