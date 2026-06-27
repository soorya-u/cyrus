import { log } from "evlog";
import { partyserverMiddleware } from "hono-party";
import type { BetterAuthVariables } from "./auth";

export const socketMiddleware = partyserverMiddleware<BetterAuthVariables>({
	options: {
		prefix: "/hub",
		onBeforeRequest: (_req, _lobby, c) => {
			const user = c.get("user");
			const session = c.get("session");
			if (!(user && session)) {
				return new Response("Unauthorized", { status: 401 });
			}
		},
	},
	onError: (error) => log.error({ action: "socket-middleware-error", error }),
});
