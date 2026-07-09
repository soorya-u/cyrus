import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useContext, useEffect } from "react";
import { SignalingConnectionContext } from "../signaling/signaling-context";
import type { ConnectionErrorRenderProps, RtcDialer } from "../types";
import { RtcConnectionContext } from "./rtc-context";

type RtcProviderProps = {
	workerId: string;
	dialRtc: RtcDialer;
	pendingFallback?: ReactNode;
	errorFallback?: (props: ConnectionErrorRenderProps) => ReactNode;
	children: ReactNode;
};

export function RtcProvider({
	workerId,
	dialRtc,
	pendingFallback = null,
	errorFallback,
	children,
}: RtcProviderProps) {
	const signaling = useContext(SignalingConnectionContext);
	if (!signaling)
		throw new Error("RtcProvider must be used within SignalingProvider");

	const query = useQuery({
		queryKey: ["controller", workerId],
		queryFn: () => dialRtc(signaling.session, workerId),
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: 0,
		retry: 2,
		retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
	});

	useEffect(() => {
		const connection = query.data?.connection;
		return () => connection?.close();
	}, [query.data?.connection]);

	if (query.isPending) return pendingFallback;
	if (query.isError)
		return (
			errorFallback?.({
				error: query.error,
				retry: () => query.refetch(),
			}) ?? null
		);

	return (
		<RtcConnectionContext.Provider value={query.data}>
			{children}
		</RtcConnectionContext.Provider>
	);
}
