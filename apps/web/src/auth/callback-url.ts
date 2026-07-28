export function normalizeCallbackPath(
	callbackUrl: string | undefined
): string | null {
	if (!callbackUrl) {
		return null;
	}

	if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
		return null;
	}

	return callbackUrl;
}

export function toAbsoluteCallbackUrl(callbackPath: string): string {
	return new URL(callbackPath, window.location.origin).toString();
}
