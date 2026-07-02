import { Result } from "better-result";
import { authClient } from "@/lib/auth";
import { get, remove } from "@/store/config";
import { print } from "@/utils/style";

export async function logout(): Promise<void> {
	const token = await get("token");
	if (!token) {
		print.dim`Not logged in.`;
		return;
	}

	await Result.tryPromise(() => authClient.signOut());
	await remove("token");
	print.success`✓ Logged out.`;
}
