import { createAuthMiddleware } from "evlog/better-auth";
import { type EvlogVariables, evlog } from "evlog/hono";
import type { MiddlewareHandler } from "hono";
import { auth } from "../auth";

const identity = createAuthMiddleware(auth, {
	exclude: ["/api/auth/**"],
	include: ["/api/**"],
	maskEmail: true,
});
const logger = evlog();

export const loggingMiddleware: MiddlewareHandler<EvlogVariables> = async (
	ctx,
	next
) => {
	await logger(ctx, async () => {
		await identity(ctx.get("log"), ctx.req.raw.headers, ctx.req.path);
		await next();
	});
};

export type { EvlogVariables as LoggingVariables } from "evlog/hono";
