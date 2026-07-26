import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	clearHealth,
	DEFAULT_HEALTH_STALE_MS,
	isHealthy,
	markHealthReady,
	markHealthStarting,
	readHealth,
	touchHeartbeat,
} from "@/store/health";

const homes: string[] = [];

async function tempHome(): Promise<string> {
	const home = await mkdtemp(join(tmpdir(), "cyrus-health-"));
	homes.push(home);
	return home;
}

afterEach(async () => {
	await Promise.all(
		homes.splice(0).map((home) => rm(home, { recursive: true, force: true }))
	);
});

describe("worker health file", () => {
	test("isHealthy is false when no health file exists", async () => {
		const home = await tempHome();
		expect(await isHealthy({ home })).toBe(false);
	});

	test("isHealthy is false while status is starting", async () => {
		const home = await tempHome();
		await markHealthStarting({ home, pid: process.pid });

		expect(await isHealthy({ home })).toBe(false);
		expect(await readHealth({ home })).toMatchObject({
			status: "starting",
			pid: process.pid,
		});
	});

	test("isHealthy is true after ready with a fresh heartbeat and live pid", async () => {
		const home = await tempHome();
		await markHealthReady({ home, pid: process.pid });

		expect(await isHealthy({ home })).toBe(true);
		const health = await readHealth({ home });
		expect(health?.status).toBe("ready");
		expect(health?.pid).toBe(process.pid);
		expect(health?.connectedAt).toBeTruthy();
		expect(health?.heartbeat).toBeTruthy();
	});

	test("isHealthy is false when the heartbeat is stale", async () => {
		const home = await tempHome();
		await markHealthReady({ home, pid: process.pid });

		expect(
			await isHealthy({
				home,
				nowMs: Date.now() + DEFAULT_HEALTH_STALE_MS + 1,
			})
		).toBe(false);
	});

	test("isHealthy is false when the recorded pid is dead", async () => {
		const home = await tempHome();
		await markHealthReady({ home, pid: 2_147_483_647 });

		expect(await isHealthy({ home })).toBe(false);
	});

	test("touchHeartbeat refreshes readiness within the stale window", async () => {
		const home = await tempHome();
		await markHealthReady({ home, pid: process.pid });
		const before = await readHealth({ home });

		await Bun.sleep(5);
		await touchHeartbeat({ home });
		const after = await readHealth({ home });

		expect(after?.heartbeat).not.toBe(before?.heartbeat);
		expect(await isHealthy({ home })).toBe(true);
	});

	test("clearHealth removes the health file", async () => {
		const home = await tempHome();
		await markHealthReady({ home, pid: process.pid });
		await clearHealth({ home });

		expect(await readHealth({ home })).toBeNull();
		expect(await isHealthy({ home })).toBe(false);
	});
});
