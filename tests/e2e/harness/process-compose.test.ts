import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
	type ProcessComposeHandle,
	restartManagedProcess,
	startProcessCompose,
	stopProcessCompose,
	waitForProcessReady,
} from "./process-compose";

const FIXTURE_PORTS = {
	api: 19_050,
	server: 19_051,
};

async function writeFixture(dir: string): Promise<string> {
	const healthFile = join(dir, "worker-health.json");
	const configPath = join(dir, "process-compose.yaml");
	await writeFile(
		configPath,
		`version: "0.5"
processes:
  server:
    command: "bun -e 'Bun.serve({port:${FIXTURE_PORTS.server},fetch:()=>new Response(\\"ok\\")}); await Bun.sleep(999999)'"
    readiness_probe:
      http_get:
        host: "127.0.0.1"
        port: ${FIXTURE_PORTS.server}
        path: "/"
      period_seconds: 1
      failure_threshold: 60
  worker:
    command: "bun -e 'const f=\\"${healthFile}\\"; const write=()=>Bun.write(f, JSON.stringify({ready:true,t:Date.now()})); write(); setInterval(write, 1000); await Bun.sleep(999999)'"
    depends_on:
      server:
        condition: process_healthy
    readiness_probe:
      exec:
        command: "bun -e 'const f=Bun.file(\\"${healthFile}\\"); if (!(await f.exists())) process.exit(1)'"
      period_seconds: 1
      failure_threshold: 60
`,
		"utf8"
	);
	return configPath;
}

describe("process-compose lifecycle", () => {
	let handle: ProcessComposeHandle | undefined;
	let dir: string | undefined;

	afterEach(async () => {
		if (handle) {
			await stopProcessCompose(handle);
			handle = undefined;
		}
		if (dir) {
			await rm(dir, { recursive: true, force: true });
			dir = undefined;
		}
	});

	test("starts dependents after readiness and restarts worker alone", async () => {
		dir = await mkdtemp(join(tmpdir(), "cyrus-pc-"));
		await mkdir(dir, { recursive: true });
		const configPath = await writeFixture(dir);

		handle = await startProcessCompose({
			configPath,
			apiPort: FIXTURE_PORTS.api,
			readyProcesses: ["server", "worker"],
		});

		const serverBefore = await waitForProcessReady(handle, "server");
		const workerBefore = await waitForProcessReady(handle, "worker");
		expect(serverBefore.is_ready).toBe("Ready");
		expect(workerBefore.is_ready).toBe("Ready");

		await restartManagedProcess(handle, "worker");
		const workerAfter = await waitForProcessReady(handle, "worker", {
			previousPid: workerBefore.pid,
		});
		const serverAfter = await waitForProcessReady(handle, "server");

		expect(workerAfter.pid).not.toBe(workerBefore.pid);
		expect(serverAfter.pid).toBe(serverBefore.pid);
		expect(workerAfter.is_ready).toBe("Ready");
		expect(serverAfter.is_ready).toBe("Ready");
	}, 60_000);
});
