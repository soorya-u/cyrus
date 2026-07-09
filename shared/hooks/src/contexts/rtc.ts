import type { ControllerContract } from "@cyrus/connections/contracts/controller";
import type { RtcConnection } from "@cyrus/connections/rtc/dial";
import { RtcConnectionContext } from "@cyrus/providers/rtc/rtc-context";
import type { RtcConnectionValue } from "@cyrus/providers/types";
import { useContext } from "react";

export type ControllerConnection = RtcConnection<ControllerContract>;

export function useRtc(): RtcConnectionValue {
	const ctx = useContext(RtcConnectionContext);
	if (!ctx) throw new Error("useRtc requires RtcProvider");

	return ctx;
}
