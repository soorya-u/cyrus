import "./config/log";
import { type ExecutionContext, Hono } from "hono";
import { auth } from "./auth";
import { checkHealth } from "./db/repositories/health";
import { type Env, middlewares } from "./middleware";

const app = new Hono<Env>();

app.get("/health", async (c) => {
	const ok = await checkHealth();
	return c.json({ ok }, ok ? 200 : 503);
});

app.use("*", middlewares);
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

export default {
	fetch: async (
		request: Request,
		env: Cloudflare.Env,
		ctx: ExecutionContext
	): Promise<Response> => app.fetch(request, env, ctx),
};

// biome-ignore lint/performance/noBarrelFile: wrangler requires Durable Object class exported from entry point
export { Hub } from "./cloudflare/partyserver";
