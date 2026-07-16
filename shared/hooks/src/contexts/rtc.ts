import { RtcConnectionContext } from "@cyrus/providers/rtc/rtc-context";
import type { RtcConnectionValue } from "@cyrus/providers/types";
import { useContext } from "react";

export function useRtc(): RtcConnectionValue {
	const ctx = useContext(RtcConnectionContext);
	if (!ctx) throw new Error("useRtc requires RtcProvider");

	return ctx;
}
