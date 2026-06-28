import { authClient } from "@/lib/auth";
import { clearToken, readToken } from "@/utils/store";
import { print } from "@/utils/style";

export async function logout(): Promise<void> {
	const token = await readToken();
	if (!token) {
		print.dim`Not logged in.`;
		return;
	}
	// Always drop the local token, even if the server sign-out fails — otherwise
	// a valid bearer token could linger on disk after a "logged out" message.
	try {
		await authClient.signOut();
	} finally {
		await clearToken();
	}
	print.success`✓ Logged out.`;
}
