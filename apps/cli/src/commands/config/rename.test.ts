import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { tempCyrusHomeFixture } from "@cyrus/test/fixtures/cyrus-home";
import { YAML } from "bun";

const CLI = join(import.meta.dir, "../../cli.ts");
const tempHome = tempCyrusHomeFixture(afterEach, "cyrus-rename-");

async function seedConfig(
	home: string,
	config: { token?: string; id?: string; name?: string }
): Promise<void> {
	await Bun.write(join(home, "config.yml"), YAML.stringify(config));
}

async function readConfig(
	home: string
): Promise<{ token?: string; id?: string; name?: string }> {
	return YAML.parse(await Bun.file(join(home, "config.yml")).text()) as {
		token?: string;
		id?: string;
		name?: string;
	};
}

async function runRename(
	home: string,
	name: string,
	serverUrl: string
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	const proc = Bun.spawn(["bun", CLI, "rename", name], {
		cwd: join(import.meta.dir, "../../.."),
		env: {
			...process.env,
			CYRUS_HOME: home,
			CLI_PUBLIC_SERVER_URL: serverUrl,
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

describe("cyrusd rename", () => {
	test("pushes the new name to the server and updates local config on success", async () => {
		const home = await tempHome();
		await seedConfig(home, { token: "test-token", name: "old-name" });

		using server = Bun.serve({
			port: 0,
			fetch(req) {
				const url = new URL(req.url);
				if (url.pathname === "/api/auth/update-session") {
					return Response.json({ session: { workerName: "new-name" } });
				}
				return new Response("not found", { status: 404 });
			},
		});

		const result = await runRename(home, "new-name", server.url.toString());

		expect(result.exitCode).toBe(0);
		expect(await readConfig(home)).toMatchObject({ name: "new-name" });
	});

	test("fails and leaves local config untouched when the server rejects the update", async () => {
		const home = await tempHome();
		await seedConfig(home, { token: "test-token", name: "old-name" });

		using server = Bun.serve({
			port: 0,
			fetch(req) {
				const url = new URL(req.url);
				if (url.pathname === "/api/auth/update-session") {
					return Response.json(
						{ message: "Internal Server Error" },
						{ status: 500 }
					);
				}
				return new Response("not found", { status: 404 });
			},
		});

		const result = await runRename(home, "new-name", server.url.toString());

		expect(result.exitCode).toBe(1);
		expect(await readConfig(home)).toMatchObject({ name: "old-name" });
	});

	test("fails without contacting the server when not logged in", async () => {
		const home = await tempHome();

		using server = Bun.serve({
			port: 0,
			fetch() {
				throw new Error("should not be called");
			},
		});

		const result = await runRename(home, "new-name", server.url.toString());

		expect(result.exitCode).toBe(1);
		expect(result.stderr + result.stdout).toContain("logged in");
	});
});
