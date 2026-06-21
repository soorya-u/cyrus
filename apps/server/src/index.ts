import { join } from "node:path";
import { auth } from "@cyrus/auth";
import { env } from "@cyrus/env/server";
import { config as dotenvConfig } from "@dotenvx/dotenvx";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { csrf } from "elysia-csrf";
import { helmet } from "elysia-helmet";
import { rateLimit } from "elysia-rate-limit";
import { initLogger, log } from "evlog";
import { createAuthMiddleware } from "evlog/better-auth";
import { evlog } from "evlog/elysia";

dotenvConfig({ path: join(import.meta.dirname, "../.env") });

initLogger({ env: { service: "cyrus/server" } });

const identifyUser = createAuthMiddleware(auth, {
	exclude: ["/api/auth/**"],
	maskEmail: true,
});

new Elysia()
	.use(helmet())
	.use(
		cors({
			origin: env.CORS_ORIGIN,
			methods: ["GET", "POST", "DELETE", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
			credentials: true,
		})
	)
	.use(
		rateLimit({
			max: 100,
			duration: 60_000,
			skip: (request: Request) =>
				new URL(request.url).pathname.startsWith("/docs"),
		})
	)
	.use(evlog())
	.derive(async ({ request, log }) => {
		await identifyUser(log, request.headers, new URL(request.url).pathname);
		return {};
	})
	.use(
		csrf({
			cookie: true,
			value: (ctx) => {
				const path = new URL(ctx.request.url).pathname;
				const origin = ctx.request.headers.get("origin");
				if (path.startsWith("/api/auth/") || !origin) {
					return ctx.cookie?._csrf?.value;
				}
				return (
					ctx.request.headers.get("x-csrf-token") ||
					ctx.request.headers.get("csrf-token") ||
					ctx.request.headers.get("xsrf-token") ||
					ctx.request.headers.get("x-xsrf-token")
				);
			},
		})
	)
	.all("/api/auth/*", ({ request, set }) => {
		if (["POST", "GET"].includes(request.method)) {
			return auth.handler(request);
		}
		set.status = 405;
		return;
	})
	.get("/health", () => "OK")
	// WS signaling (dumb relay)
	.ws("/ws", {
		open(_ws) {
			log.info("signaling", "client connected");
		},
		message(ws, message) {
			ws.send(message);
		},
		close(_ws) {
			log.info("signaling", "client disconnected");
		},
	})
	.get("/", () => "Cyrus Server OK")
	.listen(3000, () => {
		log.info("server", "Cyrus server running on http://localhost:3000");
	});
