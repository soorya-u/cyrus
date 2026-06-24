import "./config/log";
import { type ExecutionContext, Hono } from "hono";
import { auth } from "./auth";
import { type Env, middlewares } from "./middleware";

// biome-ignore lint/performance/noBarrelFile: wrangler requires Durable Object class exported from entry point
export { Room } from "./connections/socket";

const app = new Hono<Env>();

app.use("*", middlewares);

// API routes
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

export default {
	fetch: async (
		request: Request,
		env: Cloudflare.Env,
		ctx: ExecutionContext
	): Promise<Response> => app.fetch(request, env, ctx),
};
