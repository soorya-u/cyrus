import { syncRegistry } from "@/core/registry";
import { createSpinner } from "@/utils/spinner";

export async function registrySync(): Promise<void> {
	const spinner = createSpinner("Syncing ACP registry…");
	spinner.start();
	const synced = await syncRegistry();
	if (synced.isErr()) {
		spinner.error(String(synced.error));
		process.exit(1);
	}
	spinner.success("registry synced");
}
