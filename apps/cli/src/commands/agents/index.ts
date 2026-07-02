import type { Command } from "@commander-js/extra-typings";
import { commandArgParser, nameArgParser } from "@/validators/acp";
import { add } from "./add";
import { doctor } from "./doctor";
import { list } from "./list";
import { rm } from "./rm";
import { update } from "./update";

export function registerAgentsCommands(program: Command) {
	const agents = program
		.command("agents")
		.description("Manage registered ACP agents");

	agents
		.command("list")
		.alias("ls")
		.description("List registered agents")
		.action(list);

	agents
		.command("add")
		.description("Register a new agent")
		.argument("<name>", "agent name", nameArgParser)
		.requiredOption("--cmd <command>", "executable command", commandArgParser)
		.option("--args <args...>", "arguments passed to the agent command")
		.action((name, options) =>
			add(name, { command: options.cmd, args: options.args ?? [] })
		);

	agents
		.command("rm")
		.description("Remove a registered agent")
		.argument("<name>", "agent name", nameArgParser)
		.action(rm);

	agents
		.command("update")
		.description("Update a registered agent")
		.argument("<name>", "agent name", nameArgParser)
		.option("--cmd <command>", "executable command", commandArgParser)
		.option("--args <args...>", "arguments passed to the agent command")
		.action((name, options) =>
			update(name, { command: options.cmd, args: options.args })
		);

	agents
		.command("doctor")
		.description("Check agent command and ACP connectivity")
		.option(
			"--name <name>",
			"agent name (omit to check all registered agents)",
			nameArgParser
		)
		.action((options) => doctor(options.name));
}
