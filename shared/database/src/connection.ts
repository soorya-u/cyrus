import type { RepositoryError } from "@cyrus/errors/repository";
import { databaseError } from "@cyrus/errors/repository";
import type { DatabasePromise } from "@tursodatabase/database-common";
import { Result } from "better-result";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/tursodatabase/database";
import type { TursoDatabaseDatabase } from "drizzle-orm/tursodatabase/driver-core";
import { migrate } from "drizzle-orm/tursodatabase/wasm-migrator";
import { migrations } from "./migrations.generated";

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
		// NOTE: If there is any diff in models between worker and controller, this is where we control it via role.
		_role: "worker" | "controller"
	): Promise<Result<DrizzleDb, RepositoryError>> {
		return Result.tryPromise({
			try: async () => {
				this.nativeClient = await connect();
				try {
					this.drizzleDb = drizzle({ client: this.nativeClient });
					await migrate(this.drizzleDb, { migrations });
					await this.configure();
				} catch (error) {
					await this.close();
					throw error;
				}
				return this.drizzleDb;
			},
			catch: (error) =>
				databaseError(
					"Failed to open database",
					error instanceof Error ? error.message : String(error)
				),
		});
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
}

export const connection = new DatabaseConnection();
