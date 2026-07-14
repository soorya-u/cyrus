import { every } from "hono/combine";
import { corsMiddleware } from "./cors";
import { type LoggingVariables, loggingMiddleware } from "./logging";
import { partyserverMiddleware } from "./partyserver";
import { securityMiddleware } from "./security";

export type Env = { Bindings: Cloudflare.Env } & LoggingVariables;

export const middlewares = every(
	loggingMiddleware,
	corsMiddleware,
	partyserverMiddleware,
	securityMiddleware
);
