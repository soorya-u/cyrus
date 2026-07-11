import type { Command } from "@commander-js/extra-typings";
import { registryIdArgParser } from "@/validators/registry-id";
import { add } from "./add";
import { doctor } from "./doctor";
import { list } from "./list";
import { registerRegistryCommands } from "./registry";
import { rm } from "./rm";

export function registerAgentsCommands(program: Command) {
	const agents = program
		.command("agents")
		.description("Manage ACP registry agents");

	agents
		.command("list")
		.alias("ls")
		.description("List enabled agents")
		.action(list);

	agents
		.command("add")
		.description("Enable one or more agents from the ACP registry")
		.argument("<registry-id...>", "ACP registry agent id", registryIdArgParser)
		.action((_registryId, _options, command) => add(command.args));

	agents
		.command("rm")
		.description("Disable one or more enabled agents")
		.argument("<registry-id...>", "ACP registry agent id", registryIdArgParser)
		.action((_registryId, _options, command) => rm(command.args));

	agents
		.command("doctor")
		.description("Check enabled agents and ACP connectivity")
		.option(
			"--name <registry-id>",
			"registry agent id (omit to check all enabled agents)",
			registryIdArgParser
		)
		.action((options) => doctor(options.name));

	registerRegistryCommands(agents);
}
