import { removeAgent } from "@/store/agents";
import { exitWithError } from "@/utils/result";
import { print } from "@/utils/style";

export async function rm(registryIds: string[]): Promise<void> {
	let failed = false;

	for (const registryId of registryIds) {
		const removed = await removeAgent(registryId);
		if (removed.isOk()) {
			print.success`✓ removed agent "${registryId}"`;
			continue;
		}
		print.error`${removed.error}`;
		failed = true;
	}

	if (failed) exitWithError("one or more agents could not be removed");
}
