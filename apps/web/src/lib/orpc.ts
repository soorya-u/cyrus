import type { ControllerContract } from "@cyrus/connections/contracts/controller";
import { connectControllerWeb } from "@cyrus/connections/rtc/controller/web";
import type { RtcConnection } from "@cyrus/connections/rtc/dial";
import type { SignalingSession } from "@cyrus/connections/rtc/session";
import { connectSignaling } from "@cyrus/connections/rtc/session";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { getControllerId, getControllerName } from "@/utils/identity";
import { authClient } from "./auth";
import { env } from "./env";

export type ControllerConnection = RtcConnection<ControllerContract>;
export type OrpcController = Awaited<ReturnType<typeof dialController>>["orpc"];

export async function dialSignaling() {
	const { data } = await authClient.getSession();
	if (!data?.user) throw new Error("Not authenticated");

	const session = await connectSignaling({
		host: env.VITE_SERVER_URL,
		room: data.user.id,
		role: "controller",
		id: getControllerId(),
		name: getControllerName(),
	});

	return { session, orpc: createTanstackQueryUtils(session.signaling) };
}

export async function dialController(
	session: SignalingSession,
	workerId: string
) {
	const connection = await connectControllerWeb({
		signaling: session.signaling,
		events: session.events,
		to: workerId,
	});

	return { connection, orpc: createTanstackQueryUtils(connection.client) };
}
