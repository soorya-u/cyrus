import { removeAgent } from "@/store/agents";
import { print } from "@/utils/style";

export async function rm(name: string): Promise<void> {
	const removed = await removeAgent(name);
	removed.match({
		ok: () => {
			print.success`✓ removed agent "${name}"`;
		},
		err: (message) => {
			print.error`${message}`;
			process.exit(1);
		},
	});
}
