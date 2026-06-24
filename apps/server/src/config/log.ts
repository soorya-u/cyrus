import { initLogger } from "evlog";
import { env } from "./env";

initLogger({
	env: { service: "cyrus/server", environment: env.NODE_ENV },
	minLevel: env.LOG_LEVEL,
});
