import { readCachedRegistry } from "@/core/registry";
import { listEnabledAgentIds } from "@/store/agents";
import { createSpinner } from "@/utils/spinner";
import { green, print } from "@/utils/style";

export async function registryList(): Promise<void> {
	const spinner = createSpinner("Loading ACP registry…");
	spinner.start();
	const registry = await readCachedRegistry();
	spinner.stop();

	await registry.match({
		ok: async (data) => {
			const enabled = await listEnabledAgentIds();
			const ids = data.agents.map((agent) => agent.id).sort();

			if (ids.length === 0) {
				print.dim`Registry is empty.`;
				return;
			}

			for (const id of ids) {
				print.line`${enabled.has(id) ? green(id) : id}`;
			}
		},
		err: (message) => {
			print.error`${message}`;
			process.exit(1);
		},
	});
}
