import { Command } from "@commander-js/extra-typings";
import { registerAgentsCommands } from "./commands/agents";
import { registerAuthCommands } from "./commands/auth";
import { registerConfigCommands } from "./commands/config";
import { registerWorkerCommands } from "./commands/service";

export const program = new Command("cyrusd").description("Cyrus Worker");

registerAuthCommands(program);
registerConfigCommands(program);
registerAgentsCommands(program);
registerWorkerCommands(program);
