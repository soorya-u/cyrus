import { SignalingConnectionContext } from "@cyrus/providers/signaling/signaling-context";
import type { SignalingConnection } from "@cyrus/providers/types";
import { useContext } from "react";

export function useSignaling(): SignalingConnection {
	const ctx = useContext(SignalingConnectionContext);
	if (!ctx) throw new Error("useSignaling requires SignalingProvider");

	return ctx;
}
