#!/usr/bin/env bun
import { z } from "zod";

const Args = z.object({
	_: z.array(z.string()).optional(),
	name: z.string().optional(),
});

const argv = Args.parse(
	Bun.argv.slice(2).reduce((acc: any, cur, i, arr) => {
		if (cur.startsWith("--")) {
			const key = cur.replace(/^--/, "");
			const next = arr[i + 1];
			const val = next && !next.startsWith("--") ? next : true;
			acc[key] = val;
			return acc;
		}
		if (!acc._) {
			acc._ = [];
		}
		acc._.push(cur);
		return acc;
	}, {})
);

async function main() {
	const name = argv.name || "local-worker";
	console.log(`[cyrus] worker starting: ${name}`);
	console.log(
		"[cyrus] (stub) would generate device keypair, register via server, advertise capabilities."
	);
	console.log("[cyrus] Press Ctrl+C to stop.");
	// Keep alive
	await new Promise(() => {});
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
