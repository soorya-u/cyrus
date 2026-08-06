import type { WireMiddleware } from "@acp-kit/core";
import { log } from "evlog";

type JsonRpcFrameId = string | number;

function hasFrameId(frame: unknown): frame is { id: JsonRpcFrameId } {
	return (
		typeof frame === "object" &&
		frame !== null &&
		"id" in frame &&
		(typeof frame.id === "string" || typeof frame.id === "number")
	);
}

export function createWireErrorLogger(): WireMiddleware {
	const pending = new Map<
		JsonRpcFrameId,
		{ method: string; params: unknown }
	>();

	return (ctx, next) => {
		const frame = ctx.frame;
		if (!hasFrameId(frame)) return next();

		if (
			ctx.direction === "in" &&
			"method" in frame &&
			typeof frame.method === "string"
		) {
			pending.set(frame.id, {
				method: frame.method,
				params: "params" in frame ? frame.params : undefined,
			});
		} else if (ctx.direction === "out" && "error" in frame) {
			const request = pending.get(frame.id);
			log.error({
				kind: "acp_wire_request_error",
				method: request?.method,
				params: request?.params,
				error: frame.error,
			});
		}

		if ("result" in frame || "error" in frame) pending.delete(frame.id);

		return next();
	};
}
