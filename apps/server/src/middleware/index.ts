import { every } from "hono/combine";
import { authMiddleware, type BetterAuthVariables } from "./auth";
import { corsMiddleware } from "./cors";
import { type LoggingVariables, loggingMiddleware } from "./logging";
import { securityMiddleware } from "./security";
import { socketMiddleware } from "./socket";

export type Env = { Bindings: Cloudflare.Env } & LoggingVariables &
	BetterAuthVariables;
export const middlewares = every(
	loggingMiddleware,
	corsMiddleware,
	authMiddleware,
	socketMiddleware,
	securityMiddleware
);
