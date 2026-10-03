import type { Command } from "@commander-js/extra-typings";

export function registerUpgradeCommand(program: Command) {
	program
		.command("upgrade")
		.description("Upgrade cyrusd to the latest release")
		.option("--rc", "include release candidates")
		.action(async (opts) => {
			const { upgrade } = await import("./upgrade");
			await upgrade(opts);
		});
}
