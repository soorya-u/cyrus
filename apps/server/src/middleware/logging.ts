import { createAuthMiddleware } from "evlog/better-auth";
import { type EvlogVariables, evlog } from "evlog/hono";
import type { MiddlewareHandler } from "hono";
import { getAuth } from "../auth";

const logger = evlog();

const identityOptions = {
	exclude: ["/api/auth/**"],
	include: ["/api/**"],
	maskEmail: true,
};

export const loggingMiddleware: MiddlewareHandler<
	{ Bindings: Cloudflare.Env } & EvlogVariables
> = async (ctx, next) => {
	const identity = createAuthMiddleware(getAuth(ctx.env.DB), identityOptions);
	await logger(ctx, async () => {
		await identity(ctx.get("log"), ctx.req.raw.headers, ctx.req.path);
		await next();
	});
};

export type { EvlogVariables as LoggingVariables } from "evlog/hono";
