import { env } from "@cyrus/env/server";
import { cors } from "@elysiajs/cors";

export const corsPlugin = cors({
	origin: env.CORS_ORIGIN,
	methods: ["GET", "POST", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
	credentials: true,
});
