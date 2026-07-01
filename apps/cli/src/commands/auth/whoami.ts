import { authClient } from "@/lib/auth";
import { get, remove } from "@/store/config";
import { bold, print } from "@/utils/style";

type WhoamiOptions = { email?: boolean };

const field = (label: string) => bold(`${label}:`.padEnd(8));

export async function whoami(opts: WhoamiOptions): Promise<void> {
	const token = await get("token");
	if (!token) {
		print.dim`Not logged in. Run \`cyrusd login\`.`;
		process.exit(1);
	}
	const { data, error } = await authClient.getSession();
	if (error) {
		print.error`Couldn't verify session: ${error.message ?? "unknown error"}`;
		process.exit(1);
	}
	if (!data?.user) {
		await remove("token");
		print.dim`Not logged in. Run \`cyrusd login\`.`;
		process.exit(1);
	}

	const name = await get("name");
	print.line`${field("User")}${data.user.name}`;
	if (name) {
		print.line`${field("Device")}${name}`;
	}
	if (opts.email) {
		print.line`${field("Email")}${data.user.email}`;
	}
}
