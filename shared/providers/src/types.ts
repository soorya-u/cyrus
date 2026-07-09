import type { ControllerContract } from "@cyrus/connections/contracts/controller";
import type { SignalingClient } from "@cyrus/connections/contracts/signaling";
import type { RtcConnection } from "@cyrus/connections/rtc/dial";
import type { SignalingSession } from "@cyrus/connections/rtc/session";
import type { ContractRouterClient } from "@orpc/contract";
import type { createTanstackQueryUtils } from "@orpc/tanstack-query";

type ControllerClient = ContractRouterClient<ControllerContract>;

export type OrpcSignaling = ReturnType<
	typeof createTanstackQueryUtils<SignalingClient>
>;

export type OrpcController = ReturnType<
	typeof createTanstackQueryUtils<ControllerClient>
>;

export type SignalingConnection = {
	session: SignalingSession;
	orpc: OrpcSignaling;
};

export type RtcConnectionValue = {
	connection: RtcConnection<ControllerContract>;
	orpc: OrpcController;
};

export type SignalingDialer = () => Promise<SignalingConnection>;

export type RtcDialer = (
	signaling: SignalingSession,
	workerId: string
) => Promise<RtcConnectionValue>;

export type ConnectionErrorRenderProps = {
	error: Error;
	retry: () => void;
};
