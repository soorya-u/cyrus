import { Command } from "@commander-js/extra-typings";
import { RELEASE_VERSION } from "@cyrus/constants/version";
import { registerAgentsCommands } from "./commands/agents";
import { registerAuthCommands } from "./commands/auth";
import { registerConfigCommands } from "./commands/config";
import { registerWorkerCommands } from "./commands/service";
import { registerUpgradeCommand } from "./commands/upgrade";

export const program = new Command("cyrusd")
	.description("Cyrus Worker")
	.version(RELEASE_VERSION);

registerAuthCommands(program);
registerConfigCommands(program);
registerAgentsCommands(program);
registerWorkerCommands(program);
registerUpgradeCommand(program);
