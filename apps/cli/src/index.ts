import { Command } from "@commander-js/extra-typings";
import { registerAuthCommands } from "./commands/auth";
import { registerConfigCommands } from "./commands/config";
import { registerWorkerCommands } from "./commands/service";

export const program = new Command("cyrusd").description("Cyrus Worker");

registerAuthCommands(program);
registerConfigCommands(program);
registerWorkerCommands(program);
