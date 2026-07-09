import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import type { ConnectionErrorRenderProps, SignalingDialer } from "../types";
import { SignalingConnectionContext } from "./signaling-context";

type SignalingProviderProps = {
	dialSignaling: SignalingDialer;
	queryKey?: readonly unknown[];
	pendingFallback?: ReactNode;
	errorFallback?: (props: ConnectionErrorRenderProps) => ReactNode;
	children: ReactNode;
};

export function SignalingProvider({
	dialSignaling,
	queryKey = ["signaling"],
	pendingFallback = null,
	errorFallback,
	children,
}: SignalingProviderProps) {
	const query = useQuery({
		queryKey,
		queryFn: dialSignaling,
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: 0,
		retry: 2,
		retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
	});

	useEffect(() => {
		const session = query.data?.session;
		return () => session?.close();
	}, [query.data?.session]);

	if (query.isPending) return pendingFallback;
	if (query.isError)
		return (
			errorFallback?.({
				error: query.error,
				retry: () => query.refetch(),
			}) ?? null
		);

	return (
		<SignalingConnectionContext.Provider value={query.data}>
			{children}
		</SignalingConnectionContext.Provider>
	);
}

export type { SignalingConnection } from "../types";
