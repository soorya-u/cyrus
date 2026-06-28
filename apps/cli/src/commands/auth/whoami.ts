import { authClient } from "@/lib/auth";
import { clearToken, readToken } from "@/utils/store";
import { print } from "@/utils/style";

export async function whoami(): Promise<void> {
	const token = await readToken();
	if (!token) {
		print.dim`Not logged in. Run \`cyrus login\`.`;
		process.exit(1);
	}
	const { data, error } = await authClient.getSession();
	if (error) {
		print.error`Couldn't verify session: ${error.message ?? "unknown error"}`;
		process.exit(1);
	}
	if (!data?.user) {
		await clearToken();
		print.dim`Not logged in. Run \`cyrus login\`.`;
		process.exit(1);
	}
	print.line`${data.user.name}`;
	print.dim`${data.user.email}`;
}
