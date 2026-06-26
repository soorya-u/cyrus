import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import type { RouterClient } from "@orpc/server";
import type { SignalingRouter } from "./server";

export function createSignalingClient(
	websocket: WebSocket
): RouterClient<SignalingRouter> {
	const link = new RPCLink({ websocket });
	return createORPCClient(link);
}
