import { useSignaling } from "@cyrus/hooks/contexts/signaling";
import { useEffect } from "react";
import { toast } from "sonner";

export function useWorkerJoinToast() {
	const { session: signaling } = useSignaling();

	useEffect(
		() =>
			signaling.events.subscribe((event) => {
				if (event.type === "peer-joined" && event.peer.role === "worker")
					toast.success(`${event.peer.name} connected`);
			}),
		[signaling]
	);
}
