import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initRepository, openRepository } from "es-git";
import { watchGitDirectory } from "@/git/file-watch";

const DEBOUNCE_MS = 40;
const SETTLE_MS = 400;

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => {
	for (const cleanup of cleanups.splice(0)) await cleanup();
});

async function startWatch(debounceMs = DEBOUNCE_MS, maxWaitMs?: number) {
	const dir = await mkdtemp(join(tmpdir(), "cyrus-watch-"));
	await initRepository(dir, { initialHead: "main" });
	await writeFile(join(dir, ".gitignore"), "*.log\nnode_modules/\n");
	const controller = new AbortController();
	const watch = await watchGitDirectory(dir, {
		debounceMs,
		maxWaitMs,
		signal: controller.signal,
	});
	if (!watch.isOk()) throw new Error("watch failed to start");
	let signals = 0;
	const consumer = (async () => {
		for await (const _ of watch.value) signals++;
	})();
	cleanups.push(async () => {
		controller.abort();
		await consumer;
		await rm(dir, { recursive: true, force: true });
	});
	// Let the native watcher finish arming before the test touches files.
	await Bun.sleep(150);
	return {
		dir,
		count: () => signals,
		stop: async () => {
			controller.abort();
			await consumer;
		},
	};
}

describe("watchGitDirectory", () => {
	test("signals once after a file is created", async () => {
		const watch = await startWatch();
		await writeFile(join(watch.dir, "new.ts"), "x");
		await Bun.sleep(SETTLE_MS);
		expect(watch.count()).toBe(1);
	});

	test("coalesces a burst of changes into one signal", async () => {
		const watch = await startWatch(250);
		for (let i = 0; i < 20; i++) {
			await writeFile(join(watch.dir, `f${i}.ts`), String(i));
		}
		await Bun.sleep(SETTLE_MS + 400);
		expect(watch.count()).toBe(1);
	});

	test("ignores gitignored files and directories", async () => {
		const watch = await startWatch();
		await writeFile(join(watch.dir, "debug.log"), "x");
		await mkdir(join(watch.dir, "node_modules"));
		await writeFile(join(watch.dir, "node_modules", "dep.js"), "x");
		await Bun.sleep(SETTLE_MS);
		expect(watch.count()).toBe(0);
	});

	test("signals when HEAD changes but not for other .git internals", async () => {
		const watch = await startWatch();
		await writeFile(join(watch.dir, ".git", "index.lock"), "x");
		await Bun.sleep(SETTLE_MS);
		expect(watch.count()).toBe(0);

		await writeFile(join(watch.dir, ".git", "HEAD"), "ref: refs/heads/other\n");
		await Bun.sleep(SETTLE_MS);
		expect(watch.count()).toBe(1);
	});

	test("stops signalling after abort", async () => {
		const watch = await startWatch();
		await watch.stop();
		await writeFile(join(watch.dir, "late.ts"), "x");
		await Bun.sleep(SETTLE_MS);
		expect(watch.count()).toBe(0);
	});

	test("still signals for a tracked file that matches an ignore pattern", async () => {
		const watch = await startWatch();
		const repo = await openRepository(watch.dir);
		await writeFile(join(watch.dir, "kept.log"), "1");
		const index = repo.index();
		index.addPath("kept.log");
		index.write();
		await Bun.sleep(SETTLE_MS);
		const before = watch.count();

		await writeFile(join(watch.dir, "kept.log"), "2");
		await Bun.sleep(SETTLE_MS);
		expect(watch.count()).toBeGreaterThan(before);
	});

	test("signals during continuous writes instead of waiting for quiet", async () => {
		const watch = await startWatch(600, 300);
		for (let i = 0; i < 30; i++) {
			await writeFile(join(watch.dir, "busy.ts"), String(i));
			await Bun.sleep(40);
		}
		// Asserted before any quiet period: only the max wait can have fired.
		expect(watch.count()).toBeGreaterThanOrEqual(1);
	});

	test("return() ends a pending next() and closing twice is safe", async () => {
		const dir = await mkdtemp(join(tmpdir(), "cyrus-watch-"));
		try {
			await initRepository(dir, { initialHead: "main" });
			const watch = await watchGitDirectory(dir);
			if (!watch.isOk()) throw new Error("watch failed to start");
			const pending = watch.value.next();
			await watch.value.return?.(undefined);
			expect(await pending).toEqual({ done: true, value: undefined });
			await watch.value.return?.(undefined);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	test("watches a plain directory and filters by git once it is initialised", async () => {
		const dir = await mkdtemp(join(tmpdir(), "cyrus-watch-"));
		const controller = new AbortController();
		let signals = 0;
		let consumer: Promise<void> | undefined;
		try {
			const watch = await watchGitDirectory(dir, {
				debounceMs: DEBOUNCE_MS,
				signal: controller.signal,
			});
			if (!watch.isOk()) throw new Error("watch failed to start");
			const iterator = watch.value;
			consumer = (async () => {
				for await (const _ of iterator) signals++;
			})();
			await Bun.sleep(150);

			// Nothing is ignored without a repository.
			await writeFile(join(dir, "debug.log"), "x");
			await Bun.sleep(SETTLE_MS);
			expect(signals).toBe(1);

			// Initialising the repository is itself signalled...
			await initRepository(dir, { initialHead: "main" });
			await Bun.sleep(SETTLE_MS);
			expect(signals).toBeGreaterThan(1);

			// ...and ignore rules apply from then on.
			await writeFile(join(dir, ".gitignore"), "*.log\n");
			await Bun.sleep(SETTLE_MS);
			const settled = signals;
			await writeFile(join(dir, "other.log"), "x");
			await Bun.sleep(SETTLE_MS);
			expect(signals).toBe(settled);
		} finally {
			controller.abort();
			await consumer;
			await rm(dir, { recursive: true, force: true });
		}
	});
});
