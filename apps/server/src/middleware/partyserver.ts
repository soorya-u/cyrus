import { Result } from "better-result";
import { log } from "evlog";
import { env } from "hono/adapter";
import { createMiddleware } from "hono/factory";
import { routePartykitRequest } from "partyserver";
import { WS_BASE_PROTOCOL, wsTicketVerifier } from "../auth/ws";

const WS_PROTOCOL_HEADER = "Sec-WebSocket-Protocol";

const options = {
	prefix: "ws",
	onBeforeConnect: async (req: Request) => {
		const protocolHeader = req.headers.get(WS_PROTOCOL_HEADER);
		const payload = await wsTicketVerifier.verify({ protocolHeader });
		if (!payload) return new Response("Unauthorized", { status: 401 });

		const offered = (protocolHeader ?? "").split(",").map((p) => p.trim());

		if (!offered.includes(WS_BASE_PROTOCOL))
			return new Response("Unauthorized", { status: 401 });

		const headers = new Headers(req.headers);
		headers.set("X-User-Id", payload.userId);
		return new Request(req, { headers });
	},
};

export const partyserverMiddleware = createMiddleware(async (c, next) =>
	(
		await Result.tryPromise({
			try: async () => {
				const isUpgrade =
					c.req.header("upgrade")?.toLowerCase() === "websocket";
				const response = await routePartykitRequest(
					c.req.raw.clone(),
					env(c),
					options
				);
				if (!response) return null;

				if (!(isUpgrade && response.webSocket)) return response;

				const protocol = response.headers.get(WS_PROTOCOL_HEADER);
				return new Response(null, {
					status: 101,
					webSocket: response.webSocket,
					...(protocol && {
						headers: { [WS_PROTOCOL_HEADER]: protocol },
					}),
				});
			},
			catch: (error) => {
				log.error({ action: "socket-middleware-error", error });
				return error;
			},
		})
	).match({
		ok: (response) => response ?? next(),
		err: () => next(),
	})
);
