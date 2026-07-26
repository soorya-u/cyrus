import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import type { D1Migration } from "@cloudflare/vitest-pool-workers";

const MIGRATION_PATH = /^\.\/([^/]+)\/migration\.sql$/;

function readDrizzleD1Migrations(): D1Migration[] {
	const modules = import.meta.glob("./*/migration.sql", {
		query: "?raw",
		import: "default",
		eager: true,
	});

	return Object.entries(modules)
		.flatMap(([modulePath, sql]) => {
			const name = MIGRATION_PATH.exec(modulePath)?.[1];
			if (!name) return [];

			return [
				{
					name,
					queries: sql
						.split("--> statement-breakpoint")
						.map((query) => query.trim())
						.filter(Boolean),
				},
			];
		})
		.sort((a, b) => a.name.localeCompare(b.name));
}

await applyD1Migrations(env.DB, readDrizzleD1Migrations());

declare global {
	// biome-ignore lint/style/useConsistentTypeDefinitions: must interface-merge ImportMeta
	interface ImportMeta {
		glob(
			pattern: string,
			options: {
				query: string;
				import: string;
				eager: true;
			}
		): Record<string, string>;
	}
}
