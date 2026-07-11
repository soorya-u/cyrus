import { syncRegistry } from "@/core/registry";
import { createSpinner } from "@/utils/spinner";

export async function registrySync(): Promise<void> {
	const spinner = createSpinner("Syncing ACP registry…");
	spinner.start();
	const synced = await syncRegistry();
	synced.match({
		ok: () => spinner.success("registry synced"),
		err: (message) => {
			spinner.error(message);
			process.exit(1);
		},
	});
}
