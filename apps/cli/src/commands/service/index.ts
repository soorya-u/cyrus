import type { Command } from "@commander-js/extra-typings";

export function registerWorkerCommands(program: Command) {
	program
		.command("start")
		.description("Start the worker")
		.option("--bg", "run in the background")
		.action(async (opts) => {
			const { start } = await import("./start");
			await start(opts);
		});

	program
		.command("status")
		.description("Check whether the worker is running")
		.action(async () => {
			const { status } = await import("./status");
			await status();
		});

	program
		.command("stop")
		.description("Stop the running worker")
		.action(async () => {
			const { stop } = await import("./stop");
			await stop();
		});
}
