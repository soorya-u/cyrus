import type { Command } from "@commander-js/extra-typings";
import { rename } from "./rename";

export function registerConfigCommands(program: Command) {
	program
		.command("rename")
		.description("Rename this device")
		.argument("<name>", "new device name")
		.action(rename);
}
