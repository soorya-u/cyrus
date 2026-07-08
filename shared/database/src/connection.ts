import type { DatabasePromise } from "@tursodatabase/database-common";
import { pushSchema } from "drizzle-kit/payload/sqlite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/tursodatabase/database";
import type { TursoDatabaseDatabase } from "drizzle-orm/tursodatabase/driver-core";
import { commonModels as models } from "./models";

export type DrizzleDb = TursoDatabaseDatabase;

export type DatabaseConnect = () => Promise<DatabasePromise>;

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
		connect: DatabaseConnect,
		// NOTE: If there is any diff in models between worker and controller, this
		// is where we control it via role.
		role: "worker" | "controller"
	): Promise<DrizzleDb> {
		return this.setup(connect, models, role);
	}

	async setup(
		connect: DatabaseConnect,
		schema: Record<string, unknown>,
		_role: "worker" | "controller"
	): Promise<DrizzleDb> {
		const bootstrap = await connect();
		await this.push(bootstrap, schema);
		await bootstrap.close();

		const client = await connect();
		this.nativeClient = client;
		this.drizzleDb = drizzle({ client });
		await this.configure();
		return this.drizzleDb;
	}

	async close(): Promise<void> {
		if (!this.nativeClient) return;
		await this.nativeClient.close();
		this.nativeClient = null;
		this.drizzleDb = null;
	}

	private async configure(): Promise<void> {
		await this.db.run(sql`PRAGMA foreign_keys = ON`);
		await this.db.run(sql`PRAGMA journal_mode = WAL`);
	}

	private async push(
		client: DatabasePromise,
		schema: Record<string, unknown>
	): Promise<void> {
		const result = await pushSchema(schema, {
			query: async (query, params) => {
				const stmt = await client.prepare(query);
				return stmt.all(...(params ?? []));
			},
			run: (query) => client.exec(query),
			batch: async (statements) => {
				for (const statement of statements) await client.exec(statement);
			},
		});
		await result.apply();
	}
}

export const connection = new DatabaseConnection();
