#!/usr/bin/env bun
import {
	cancel,
	intro,
	isCancel,
	note,
	outro,
	select,
	text,
} from "@clack/prompts";
import { Command } from "@commander-js/extra-typings";
import { serverStatus, startServer, stopServer } from "./serve";

function fmtUptime(ms: number): string {
	const s = Math.floor(ms / 1000);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const r = s % 60;
	if (h > 0) {
		return `${h}h ${m}m ${r}s`;
	}
	if (m > 0) {
		return `${m}m ${r}s`;
	}
	return `${r}s`;
}

async function interactive(): Promise<void> {
	intro("cyrus");
	const action = await select({
		message: "What do you want to do?",
		options: [
			{ value: "serve", label: "Start server (background)" },
			{ value: "status", label: "Show status" },
			{ value: "stop", label: "Stop server" },
			{ value: "exit", label: "Exit" },
		],
	});

	if (isCancel(action) || action === "exit") {
		outro("bye");
		return;
	}

	switch (action) {
		case "serve": {
			const port = await text({
				message: "Port?",
				defaultValue: "3000",
				placeholder: "3000",
			});
			if (isCancel(port)) {
				return outro("cancelled");
			}
			try {
				const { pid } = startServer({ port: Number(port), detached: true });
				note(
					`pid ${pid}\nlogs: ~/.cyrus/server.log`,
					"server started in background"
				);
			} catch (e) {
				cancel(String((e as Error).message));
			}
			break;
		}
		case "status": {
			const s = serverStatus();
			note(
				s.running
					? `running\npid: ${s.pid}\nport: ${s.port}\nuptime: ${s.uptimeMs ? fmtUptime(s.uptimeMs) : "?"}\nlog: ${s.log}`
					: "not running",
				"server status"
			);
			break;
		}
		case "stop": {
			const ok = stopServer();
			if (ok) {
				note("stopped", "server");
			} else {
				note("was not running", "server");
			}
			break;
		}
		default:
			break;
	}
	outro("done");
}

const program = new Command()
	.name("cyrus")
	.description("Cyrus CLI — run the server in the background.")
	.action(() => {
		interactive();
	});

program
	.command("serve")
	.description("Start the Cyrus server.")
	.option("--bg", "run in background (detached)", false)
	.option("-p, --port <number>", "port to listen on", "3000")
	.option("-f, --foreground", "run in foreground (stream logs)", false)
	.action((opts: { bg: boolean; port: string; foreground: boolean }) => {
		const detached = opts.bg || !opts.foreground;
		try {
			const { pid } = startServer({ port: Number(opts.port), detached });
			if (!detached) {
				return;
			}
			console.log(`server started in background (pid ${pid})`);
			console.log("logs: ~/.cyrus/server.log");
		} catch (e) {
			console.error((e as Error).message);
			process.exit(1);
		}
	});

program
	.command("status")
	.description("Show whether the background server is running.")
	.action(() => {
		const s = serverStatus();
		if (s.running) {
			console.log(
				`running (pid ${s.pid}, port ${s.port}, uptime ${s.uptimeMs ? fmtUptime(s.uptimeMs) : "?"})`
			);
			console.log(`log: ${s.log}`);
		} else {
			console.log("not running");
		}
	});

program
	.command("stop")
	.description("Stop the background server.")
	.action(() => {
		const ok = stopServer();
		console.log(ok ? "stopped" : "not running");
	});

program.parse();
