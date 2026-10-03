import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { connect } from "@tursodatabase/database";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { renderMigrationsModule } from "../../scripts/embed-migrations";
import { connection } from "../../src/connection";
import { migrations } from "../../src/migrations.generated";

describe("embedded migrations", () => {
	test("generated module matches the migrations folder", async () => {
		const rendered = await renderMigrationsModule();
		for (const [name, sql] of Object.entries(migrations)) {
			expect(rendered).toContain(JSON.stringify(name));
			expect(rendered).toContain(JSON.stringify(sql));
		}
		expect(rendered.match(/^\t"/gm)).toHaveLength(
			Object.keys(migrations).length
		);
	});

	describe("applied to a file database", () => {
		let dir: string;

		beforeEach(async () => {
			dir = await mkdtemp(join(tmpdir(), "cyrus-migrations-test-"));
		});

		afterEach(async () => {
			await connection.close();
			await rm(dir, { recursive: true, force: true });
		});

		test("creates the schema once and keeps data across reopen", async () => {
			const path = join(dir, "store.db");
			const open = () => connection.open(() => connect(path), "worker");

			const first = await open();
			expect(first.isOk()).toBe(true);
			await connection.client.exec(
				"INSERT INTO projects (id, cwd, name) VALUES ('p1', '/tmp', 'kept')"
			);
			await connection.close();

			const second = await open();
			expect(second.isOk()).toBe(true);
			const statement = await connection.client.prepare(
				"SELECT name FROM projects"
			);
			const rows = await statement.all();
			expect(rows).toEqual([{ name: "kept" }]);
		});

		test("returns an error and releases the connection when migrating fails", async () => {
			const path = join(dir, "store.db");
			const seed = await connect(path);
			await seed.exec("CREATE TABLE projects (id text)");
			await seed.close();

			const result = await connection.open(() => connect(path), "worker");
			expect(result.isErr()).toBe(true);
			expect(() => connection.client).toThrow("not initialized");
		});
	});
});
