import { removeAgent } from "@/store/agents";
import { print } from "@/utils/style";

export async function rm(registryIds: string[]): Promise<void> {
	let failed = false;

	for (const registryId of registryIds) {
		const removed = await removeAgent(registryId);
		removed.match({
			ok: () => print.success`✓ removed agent "${registryId}"`,
			err: (message) => {
				print.error`${message}`;
				failed = true;
			},
		});
	}

	if (failed) process.exit(1);
}
