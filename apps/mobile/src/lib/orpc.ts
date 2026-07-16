import { connectControllerNative } from "@cyrus/connections/rtc/controller/native";
import { connectSignaling } from "@cyrus/connections/rtc/session";
import type { RtcDialer, SignalingDialer } from "@cyrus/providers/types";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { authClient } from "./auth";
import { env } from "./env";
import { getControllerId, getControllerName } from "./identity";

export const dialSignaling: SignalingDialer = async () => {
	const { data } = await authClient.getSession();
	if (!data?.user) throw new Error("Not authenticated");

	const session = await connectSignaling({
		host: env.EXPO_PUBLIC_SERVER_URL,
		room: data.user.id,
		role: "controller",
		id: await getControllerId(),
		name: await getControllerName(),
		protocols: authClient.wsTicket.protocols,
	});

	return { session, orpc: createTanstackQueryUtils(session.signaling) };
};

export const dialRtc: RtcDialer = async (session, workerId) => {
	const connection = await connectControllerNative({
		signaling: session.signaling,
		events: session.events,
		to: workerId,
	});

	return { connection, orpc: createTanstackQueryUtils(connection.client) };
};
