import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { tempCyrusHomeFixture } from "@cyrus/test/fixtures/cyrus-home";
import { markHealthReady, markHealthStarting } from "@/store/health";

const CLI = join(import.meta.dir, "../../cli.ts");
const tempHome = tempCyrusHomeFixture(afterEach, "cyrus-status-");

async function runStatus(home: string): Promise<{
	exitCode: number;
	stdout: string;
	stderr: string;
}> {
	const proc = Bun.spawn(["bun", CLI, "status"], {
		cwd: join(import.meta.dir, "../../.."),
		env: {
			...process.env,
			CYRUS_HOME: home,
			CLI_PUBLIC_SERVER_URL:
				process.env.CLI_PUBLIC_SERVER_URL ?? "http://localhost:8787",
		},
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { exitCode, stdout, stderr };
}

describe("cyrusd status", () => {
	test("exits 1 when the worker is not running", async () => {
		const home = await tempHome();
		const result = await runStatus(home);
		expect(result.exitCode).toBe(1);
		expect(result.stdout).toContain("Not running");
	});

	test("exits 1 when the worker is running but not ready", async () => {
		const home = await tempHome();
		await Bun.write(join(home, "worker.pid"), String(process.pid));
		await markHealthStarting({ home, pid: process.pid });

		const result = await runStatus(home);
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("not ready");
	});

	test("exits 0 when the worker is ready and heartbeating", async () => {
		const home = await tempHome();
		await Bun.write(join(home, "worker.pid"), String(process.pid));
		await markHealthReady({ home, pid: process.pid });

		const result = await runStatus(home);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain(`Running (pid ${process.pid})`);
	});
});
