import { SIGNALING_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSignaling } from "../contexts/signaling";

export function useWorkers() {
	const queryClient = useQueryClient();
	const { session: signaling, orpc: orpcSignaling } = useSignaling();
	const listPeersOptions = orpcSignaling.listPeers.queryOptions({
		queryKey: SIGNALING_OPERATION_KEYS.listPeers,
	});
	const { data: peers = [] } = useQuery(listPeersOptions);

	useEffect(
		() =>
			signaling.events.subscribe((event) => {
				if (event.type === "peer-joined" || event.type === "peer-left") {
					queryClient.invalidateQueries({
						queryKey: listPeersOptions.queryKey,
					});
				}
			}),
		[signaling, queryClient, listPeersOptions.queryKey]
	);

	return peers.filter((peer) => peer.role === "worker");
}
