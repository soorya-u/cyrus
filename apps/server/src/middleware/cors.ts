import { cors } from "hono/cors";
import { env } from "../config/env";

const allowedOrigins = [...env.ALLOWED_ORIGINS, env.PRODUCTION_URL];

export const corsMiddleware = cors({
	origin: (origin) =>
		allowedOrigins.some((o) => origin.startsWith(o)) ? origin : null,
	allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
	exposeHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
	credentials: true,
});
