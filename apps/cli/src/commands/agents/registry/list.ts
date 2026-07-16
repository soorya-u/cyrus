import { readCachedRegistry } from "@/core/registry";
import { listEnabledAgentIds } from "@/store/agents";
import { unwrapOrExit } from "@/utils/result";
import { createSpinner } from "@/utils/spinner";
import { green, print } from "@/utils/style";

export async function registryList(): Promise<void> {
	const spinner = createSpinner("Loading ACP registry…");
	spinner.start();
	const registry = await readCachedRegistry();
	spinner.stop();

	const data = unwrapOrExit(registry);
	const enabled = await listEnabledAgentIds();
	const ids = data.agents.map((agent) => agent.id).sort();

	if (ids.length === 0) {
		print.dim`Registry is empty.`;
		return;
	}

	for (const id of ids) print.line`${enabled.has(id) ? green(id) : id}`;
}
