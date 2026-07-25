import { defineConfig } from "drizzle-kit";

// D1 tooling config. Application repositories use the Worker D1 binding (#109);
// better-auth remains on Neon until cutover (#110 / #112).
// `generate` needs only the sqlite dialect. `push`/`studio` use the D1 HTTP driver
// when Cloudflare credentials are set; otherwise a local sqlite file so the
// commands still work without a Cloudflare account.
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
const token = process.env.CLOUDFLARE_D1_TOKEN;

export default defineConfig({
	schema: "./src/db/models/index.ts",
	out: "./src/db/migrations",
	dialect: "sqlite",
	...(accountId && databaseId && token
		? {
				driver: "d1-http" as const,
				dbCredentials: { accountId, databaseId, token },
			}
		: {
				dbCredentials: {
					url: process.env.D1_LOCAL_DB ?? "file:./.local/d1/cyrus.sqlite",
				},
			}),
});
