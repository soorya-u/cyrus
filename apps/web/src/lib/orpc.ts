import { connectControllerWeb } from "@cyrus/connections/rtc/controller/web";
import { connectSignaling } from "@cyrus/connections/rtc/session";
import { signalingFailedError } from "@cyrus/errors/connection";
import type { RtcDialer, SignalingDialer } from "@cyrus/providers/types";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { getControllerId, getControllerName } from "@/stores/identity";
import { authClient } from "./auth";
import { env } from "./env";

export const dialSignaling: SignalingDialer = async () => {
	const { data } = await authClient.getSession();
	if (!data?.user) throw signalingFailedError("Not authenticated");

	const session = await connectSignaling({
		host: env.VITE_SERVER_URL,
		room: data.user.id,
		role: "controller",
		id: getControllerId(),
		name: getControllerName(),
		protocols: authClient.wsTicket.protocols,
	});
	if (session.isErr()) throw session.error;

	return {
		session: session.value,
		orpc: createTanstackQueryUtils(session.value.signaling),
	};
};

export const dialRtc: RtcDialer = async (session, workerId) => {
	const connection = await connectControllerWeb({
		signaling: session.signaling,
		events: session.events,
		to: workerId,
	});
	if (connection.isErr()) throw connection.error;

	return {
		connection: connection.value,
		orpc: createTanstackQueryUtils(connection.value.client),
	};
};
