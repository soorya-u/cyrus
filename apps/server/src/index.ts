import { join } from "node:path";
import { auth } from "@cyrus/auth";
import { env } from "@cyrus/env/server";
import { config as dotenvConfig } from "@dotenvx/dotenvx";
import { Elysia } from "elysia";
import { BunAdapter } from "elysia/adapter/bun";
import { initLogger, log } from "evlog";
import {
	corsPlugin,
	healthcheckPlugin,
	loggingPlugin,
	openApiDocsPlugin,
	rateLimitPlugin,
	securityPlugin,
} from "./plugins";
import { socket } from "./socket";

dotenvConfig({
	path: join(import.meta.dirname, "../.env"),
	quiet: true,
});

initLogger({ env: { service: "cyrus/server" } });

export const app = new Elysia({ adapter: BunAdapter, aot: true })
	.use(securityPlugin)
	.use(corsPlugin)
	.use(rateLimitPlugin)
	.use(loggingPlugin)
	.use(openApiDocsPlugin)
	.use(healthcheckPlugin)
	.mount(auth.handler)
	.mount(socket);

// Only start the HTTP server when run directly (not imported as a Vercel Function)
if (import.meta.main) {
	app.listen(env.PORT, (server) =>
		log.info(
			"server",
			`Cyrus server running on http://${server.hostname}:${server.port}`
		)
	);
}

export default app;
