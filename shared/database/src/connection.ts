import type { DatabasePromise } from "@tursodatabase/database-common";
import { pushSchema } from "drizzle-kit/payload/sqlite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/tursodatabase/database";
import type { TursoDatabaseDatabase } from "drizzle-orm/tursodatabase/driver-core";
import { commonModels as models } from "./models";

export type DrizzleDb = TursoDatabaseDatabase;

export class DatabaseConnection {
	private nativeClient: DatabasePromise | null = null;
	private drizzleDb: DrizzleDb | null = null;

	get client(): DatabasePromise {
		if (!this.nativeClient)
			throw new Error("DatabaseConnection is not initialized");

		return this.nativeClient;
	}

	get db(): DrizzleDb {
		if (!this.drizzleDb)
			throw new Error("DatabaseConnection is not initialized");

		return this.drizzleDb;
	}

	open(
		client: DatabasePromise,
		// TODO: If there is any diff in models between worker and controller, this is where we control it
		_type: "worker" | "controller"
	): Promise<DrizzleDb> {
		return this.setup(client, models);
	}

	async setup(
		client: DatabasePromise,
		schema: Record<string, unknown>
	): Promise<DrizzleDb> {
		this.nativeClient = client;
		this.drizzleDb = drizzle({ client });
		await this.configure();
		await this.push(schema);
		return this.drizzleDb;
	}

	private async configure(): Promise<void> {
		await this.db.run(sql`PRAGMA foreign_keys = ON`);
		await this.db.run(sql`PRAGMA journal_mode = WAL`);
	}

	private async push(schema: Record<string, unknown>): Promise<void> {
		const native = this.client;
		const result = await pushSchema(schema, {
			query: async (query, params) => {
				const stmt = await native.prepare(query);
				return stmt.all(...(params ?? []));
			},
			run: (query) => native.exec(query),
			batch: async (statements) => {
				for (const statement of statements) await native.exec(statement);
			},
		});
		await result.apply();
	}
}

export const connection = new DatabaseConnection();
