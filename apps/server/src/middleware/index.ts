import { every } from "hono/combine";
import { authMiddleware, type BetterAuthVariables } from "./auth";
import { corsMiddleware } from "./cors";
import { type LoggingVariables, loggingMiddleware } from "./logging";
import { partyserverMiddleware } from "./partyserver";
import { securityMiddleware } from "./security";

export type Env = { Bindings: Cloudflare.Env } & LoggingVariables &
	BetterAuthVariables;
export const middlewares = every(
	loggingMiddleware,
	corsMiddleware,
	authMiddleware,
	partyserverMiddleware,
	securityMiddleware
);
