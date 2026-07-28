export function buildDeviceCallbackPath(userCode: string | undefined): string {
	const normalizedCode = (userCode ?? "")
		.replace(/[^a-zA-Z0-9]/g, "")
		.toUpperCase();
	if (!normalizedCode) {
		return "/auth/device";
	}

	return `/auth/device?user_code=${encodeURIComponent(normalizedCode)}`;
}
