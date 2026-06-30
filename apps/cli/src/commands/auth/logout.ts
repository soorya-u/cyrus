import { authClient } from "@/lib/auth";
import { get, remove } from "@/utils/store";
import { print } from "@/utils/style";

export async function logout(): Promise<void> {
	const token = await get("token");
	if (!token) {
		print.dim`Not logged in.`;
		return;
	}
	try {
		await authClient.signOut();
	} finally {
		await remove("token");
	}
	print.success`✓ Logged out.`;
}
