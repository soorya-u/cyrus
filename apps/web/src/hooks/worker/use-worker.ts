import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { useEffect } from "react";
import { SIGNALING_OPERATION_KEYS } from "@/constants/operation-keys";

export const useWorker = () => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { orpcSignaling, signaling } = useRouteContext({ from: "/_workspace" });
	const listPeersOptions = orpcSignaling.listPeers.queryOptions({
		queryKey: SIGNALING_OPERATION_KEYS.listPeers,
	});
	const { data: peers = [] } = useQuery(listPeersOptions);

	useEffect(
		() =>
			signaling.events.subscribe((event) => {
				if (event.type === "peer-joined" || event.type === "peer-left")
					queryClient.invalidateQueries({
						queryKey: listPeersOptions.queryKey,
					});
			}),
		[signaling, queryClient, listPeersOptions.queryKey]
	);

	const workers = peers.filter((peer) => peer.role === "worker");

	const handleWorkerSelect = (value: string) => {
		if (!value) return navigate({ to: "/workers" });
		navigate({ to: "/workers/$workerId", params: { workerId: value } });
	};

	return {
		workers,
		handleWorkerSelect,
	};
};
