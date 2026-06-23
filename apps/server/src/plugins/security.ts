import { env } from "@cyrus/env/server";
import { helmet } from "elysia-helmet";

const directives =
	env.NODE_ENV === "production"
		? undefined
		: {
				"script-src": [
					"'self'",
					"'sha256-TcUB1mzXiQO4GxpTRZ0EMpOXKMU3u+n/q1WrgVIcs1I='",
					"https://cdn.jsdelivr.net",
				],
				"style-src": ["'self'", "https:", "'unsafe-inline'"],
				"img-src": ["'self'", "data:", "https:"],
			};

export const securityPlugin = helmet({
	contentSecurityPolicy: { useDefaults: true, directives },
});
