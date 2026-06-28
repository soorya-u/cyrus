import { authClient } from "@/lib/auth";
import { clearToken, readToken } from "@/utils/store";
import { print } from "@/utils/style";

export async function logout(): Promise<void> {
	if (!readToken()) {
		print.dim`Not logged in.`;
		return;
	}
	await authClient.signOut();
	clearToken();
	print.success`✓ Logged out.`;
}
