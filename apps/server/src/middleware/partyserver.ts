import { log } from "evlog";
import { partyserverMiddleware as psMiddleware } from "hono-party";
import { wsTicketVerifier } from "../auth/ws";

export const partyserverMiddleware = psMiddleware({
	options: {
		prefix: "ws",
		onBeforeConnect: async (req) => {
			const payload = await wsTicketVerifier.verify({
				protocolHeader: req.headers.get("Sec-WebSocket-Protocol"),
			});
			if (!payload) return new Response("Unauthorized", { status: 401 });

			const headers = new Headers(req.headers);
			headers.set("X-User-Id", payload.userId);
			return new Request(req, { headers });
		},
	},
	onError: (error) => log.error({ action: "socket-middleware-error", error }),
});
