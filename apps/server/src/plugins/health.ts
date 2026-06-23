import { checkHealth } from "@cyrus/db/repositories/health";
import { Result } from "better-result";
import { healthcheckPlugin as healthcheck } from "elysia-healthcheck";
import { log } from "evlog";

export const healthcheckPlugin = healthcheck({
	prefix: "/api/health",
	checks: {
		readiness: [
			async () => {
				const result = await Result.tryPromise(checkHealth, {
					retry: {
						backoff: "exponential",
						delayMs: 100,
						times: 3,
					},
				});
				result.tapError((error) =>
					log.error({
						action: "database-readiness",
						error,
					})
				);
				return {
					name: "database-readiness",
					healthy: result.isOk(),
				};
			},
		],
	},
});
