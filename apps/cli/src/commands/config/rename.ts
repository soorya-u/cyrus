import { syncWorkerName } from "@/lib/auth";
import { get, set } from "@/store/config";
import { runningPid } from "@/utils/process";
import { print } from "@/utils/style";

export async function rename(name: string): Promise<void> {
	if ((await get("token")) === null) {
		print.dim`Not logged in. Run \`cyrusd login\`.`;
		process.exit(1);
	}

	const syncResult = await syncWorkerName(name);
	if (syncResult.isErr()) {
		print.error`Failed to update worker name on the server: ${syncResult.error}`;
		process.exit(1);
	}

	await set("name", name);
	print.success`✓ renamed to "${name}"`;
	if ((await runningPid()) !== null)
		print.dim`Restart the worker (cyrusd stop && cyrusd start) for the new name to take effect.`;
}
