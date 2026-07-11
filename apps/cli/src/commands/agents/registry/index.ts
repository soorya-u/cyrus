import type { Command } from "@commander-js/extra-typings";
import { registryList } from "./list";
import { registrySync } from "./sync";

export function registerRegistryCommands(agents: Command) {
	const registry = agents
		.command("registry")
		.description("List ACP registry agent ids (green = enabled)")
		.action(registryList);

	registry
		.command("sync")
		.description("Refresh the ACP registry cache from the CDN")
		.action(registrySync);
}
